// about: https://800147.github.io/on-screen-logger/

(() => {
  "use strict";

  const STYLE = `
:where(.OSLogger) {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  opacity: 0.65;
  font: 0.75rem/1.5 monospace;
  z-index: 9999;
}

:where(.OSLogger-Record) {
  font: inherit;
  margin: 0.5em;
  white-space: pre-wrap;
  word-break: break-word;
}

:where(.OSLogger-RecordContent) {
  box-decoration-break: clone;
  border-radius: 0.25em;
  padding: 0 0.25em;

  color: black;
  background-color: white;
}

:where(.OSLogger-Record_type_warn .OSLogger-RecordContent) {
  color: brown;
  background-color: cornsilk;
}

:where(.OSLogger-Record_type_error .OSLogger-RecordContent) {
  color: darkred;
  background-color: pink;
}

:where(.OSLogger-Number) {
  color: darkgreen;
}

:where(.OSLogger-Group > :first-child) {
  margin-left: 0.5em;
}

:where(.OSLogger-Group) {
  position: relative;
  margin-left: 0;
}

:where(.OSLogger-Group)::before, :where(.OSLogger-Group)::after {
  content: '';
  display: block;
  width: 0.125em;
  position: absolute;
  z-index: -1;
  inset: 0.5em auto 0.25em 0.625em;
  background-color: black;
}

:where(.OSLogger-Group)::after {
  inset: 0.5em auto 0.25em 0.5em;
  background-color: white;
}

:where(.OSLogger-Group > :not(:first-child)) {
  margin-left: 1.5em;
}

:where(.OSLogger-Group > .OSLogger-Group:not(:first-child)) {
  margin-left: 1em;
}

`;

  const loggerRoot = Object.assign(document.createElement("div"), {
    className: "OSLogger",
    inert: true,
  });
  const oldConsole = { ...console };
  const counts = Object.create(null);
  const timers = Object.create(null);
  let slot = loggerRoot;

  const scrollToBottom = () => loggerRoot.scroll(0, loggerRoot.scrollHeight);
  const round1000 = (num) => Math.round(num * 1000) / 1000;
  const unsupported =
    (funcName) =>
    (...args) => {
      print(args, { unsupported: funcName });
      oldConsole[funcName]?.apply(console, args);
    };

  const print = (args, { unsupported, type = "log" } = {}) => {
    if (unsupported) {
      type = "warn";
    }

    const p = Object.assign(document.createElement("p"), {
      className: `OSLogger-Record OSLogger-Record_type_${type}`,
    });

    const content = Object.assign(document.createElement("span"), {
      className: "OSLogger-RecordContent",
    });

    p.appendChild(content);

    if (unsupported) {
      content.appendChild(
        document.createTextNode(`UNSUPPORTED CALL: console.${unsupported}(`)
      );
    }

    args.forEach((arg, i) => {
      if (i) {
        content.appendChild(document.createTextNode(unsupported ? ", " : " "));
      }

      if (Array.isArray(arg)) {
        content.appendChild(
          Object.assign(document.createElement("span"), {
            className: "OSLogger-Array",
            textContent: JSON.stringify(arg),
          })
        );
      } else if (typeof arg === "string") {
        content.appendChild(
          Object.assign(document.createElement("span"), {
            className: "OSLogger-String",
            textContent: unsupported ? JSON.stringify(arg) : arg,
          })
        );
      } else if (typeof arg === "number") {
        content.appendChild(
          Object.assign(document.createElement("span"), {
            className: "OSLogger-Number",
            textContent: arg,
          })
        );
      } else if (String(arg) === "[object Object]") {
        content.appendChild(
          Object.assign(document.createElement("span"), {
            className: "OSLogger-Object",
            textContent: JSON.stringify(arg),
          })
        );
      } else {
        content.appendChild(
          Object.assign(document.createElement("span"), {
            className: "OSLogger-Object",
            textContent: String(arg),
          })
        );
      }
    });

    if (unsupported) {
      content.appendChild(document.createTextNode(")"));
    }

    slot.appendChild(p);
    scrollToBottom();
  };

  const timeLog = (label = "dafault", isEnd) => {
    if (timers[label] === undefined) {
      print([`Timer "${label}" doesn't exist`], { type: "warn" });
    } else {
      print([
        `${label}: ${round1000(performance.now() - timers[label])}ms${
          isEnd ? " — ended" : ""
        }`,
      ]);
      if (isEnd) {
        delete timers[label];
      }
    }
  };

  const group = (label, isCollapse) => {
    const groupEl = Object.assign(document.createElement("div"), {
      className: "OSLogger-Group",
    });
    const groupName = label ? ` "${label}"` : "";
    const collapseMessage = isCollapse ? " (couldn't collapse)" : "";
    slot.appendChild(groupEl);
    slot = groupEl;
    print([`Group${groupName}${collapseMessage}`]);
  };

  Object.assign(console, {
    log: (...args) => {
      print(args, { type: "log" });
      oldConsole.log?.apply(console, args);
    },
    error: (...args) => {
      print(args, { type: "error" });
      oldConsole.error?.apply(console, args);
    },
    info: (...args) => {
      print(args, { type: "info" });
      oldConsole.info?.apply(console, args);
    },
    warn: (...args) => {
      print(args, { type: "warn" });
      oldConsole.warn?.apply(console, args);
    },
    clear: (...args) => {
      loggerRoot.textContent = "";
      slot = loggerRoot;
      oldConsole.clear?.apply(console, args);
    },
    assert: (...args) => {
      const [flag, ...rest] = args;
      if (!flag) {
        print(["Assertion failed:", ...rest], { type: "error" });
      }
      oldConsole.assert?.apply(console, args);
    },
    count: (...args) => {
      const label = args[0] ?? "dafault";
      counts[label] = (counts[label] ?? 0) + 1;
      print([`${label}:`, counts[label]]);
      oldConsole.count?.apply(console, args);
    },
    countReset: (...args) => {
      const label = args[0] ?? "dafault";
      if (counts[label] === undefined) {
        print([`Counter "${label}" doesn't exist`], { type: "warn" });
      } else {
        counts[label] = 0;
        print([`${label}:`, counts[label]]);
      }
      oldConsole.countReset?.apply(console, args);
    },
    time: (...args) => {
      const label = args[0] ?? "dafault";
      if (timers[label] !== undefined) {
        print([`Timer "${label}" already exists`], { type: "warn" });
      } else {
        timers[label] = performance.now();
      }
      oldConsole.time?.apply(console, args);
    },
    timeLog: (...args) => {
      timeLog(args[0]);
      oldConsole.timeLog?.apply(console, args);
    },
    timeEnd: (...args) => {
      timeLog(args[0], true);
      oldConsole.timeEnd?.apply(console, args);
    },
    group: (...args) => {
      group(args[0]);
      oldConsole.group?.apply(console, args);
    },
    groupCollapsed: (...args) => {
      group(args[0], true);
      oldConsole.groupCollapsed?.apply(console, args);
    },
    groupEnd: (...args) => {
      if (slot !== loggerRoot) {
        slot = slot.parentElement;
      }
      oldConsole.groupEnd?.apply(console, args);
    },

    debug: unsupported("debug"),
    dir: unsupported("dir"),
    dirxml: unsupported("dirxml"),
    table: unsupported("table"),
    timeStamp: unsupported("timeStamp"),
    trace: unsupported("trace"),
  });

  const onLoad = () => {
    document.body.appendChild(loggerRoot);
    document.head.appendChild(
      Object.assign(document.createElement("style"), { textContent: STYLE })
    );

    new ResizeObserver(scrollToBottom).observe(loggerRoot);
    scrollToBottom();
  };

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", onLoad);
  } else {
    onLoad();
  }

  const oldWindowOnError = window.onerror;

  window.onerror = (error, url, line, column, ...rest) => {
    print(
      [
        `Uncaught ${error} [${url.replace(
          new RegExp(`^${window.location.origin}/`),
          ""
        )}:${line}:${column}]`,
      ],
      { type: "error" }
    );

    oldWindowOnError?.call(window, error, url, line, column, ...rest);
  };

  window.addEventListener("unhandledrejection", ({ reason }) => {
    const { stack } = reason;
    print(
      [
        `Uncaught (in promise) ${reason}\n${stack.replace(
          new RegExp(`^${reason}\n|${window.location.origin}/`, "g"),
          ""
        )}`,
      ],
      {
        type: "error",
      }
    );
  });
})();
