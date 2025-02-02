"use strict";

const STYLE = `
.OSLogger {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  opacity: 0.6;
}

.OSLogger-Record {
  margin: 0.5rem;
  font: 0.75rem / 1rem monospace;
  white-space: pre-wrap;
}

.OSLogger-RecordContent {
  box-decoration-break: clone;
  border-radius: 0.25em;
  padding: 0 0.25em;

  color: black;
  background-color: white;
}

:where(.OSLogger-Record_type_warn) .OSLogger-RecordContent {
  color: brown;
  background-color: cornsilk;
}

:where(.OSLogger-Record_type_error) .OSLogger-RecordContent {
  color: darkred;
  background-color: pink;
}

.OSLogger-Number {
  color: darkgreen;
}
`;

const loggerRoot = Object.assign(document.createElement("div"), {
  className: "OSLogger",
  inert: true,
});

const scrollToBottom = () => loggerRoot.scroll(0, loggerRoot.scrollHeight);

const oldConsole = { ...console };

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

  loggerRoot.appendChild(p);
  scrollToBottom();
};

const unsupported =
  (funcName) =>
  (...args) => {
    print(args, { unsupported: funcName });
    oldConsole[funcName].apply(console, args);
  };

Object.assign(console, {
  log: (...args) => {
    print(args, { type: "log" });
    oldConsole.log.apply(console, args);
  },
  error: (...args) => {
    print(args, { type: "error" });
    oldConsole.error.apply(console, args);
  },
  info: (...args) => {
    print(args, { type: "info" });
    oldConsole.info.apply(console, args);
  },
  warn: (...args) => {
    print(args, { type: "warn" });
    oldConsole.warn.apply(console, args);
  },
  clear: (...args) => {
    loggerRoot.textContent = "";
    oldConsole.clear.apply(console, args);
  },

  assert: unsupported("assert"),
  count: unsupported("count"),
  countReset: unsupported("countReset"),
  debug: unsupported("debug"),
  dir: unsupported("dir"),
  dirxml: unsupported("dirxml"),
  group: unsupported("group"),
  groupCollapsed: unsupported("groupCollapsed"),
  groupEnd: unsupported("groupEnd"),
  table: unsupported("table"),
  time: unsupported("time"),
  timeEnd: unsupported("timeEnd"),
  timeLog: unsupported("timeLog"),
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
