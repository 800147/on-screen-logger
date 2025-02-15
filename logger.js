// about: https://800147.github.io/on-screen-logger/
(() => {
  "use strict";

  const STYLE = `
:where(.OSLogger) {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  opacity: 0.7;
  font: 0.75rem/1.5 monospace;
  z-index: 9999;
  scroll-behavior: smooth;
}

.OSLogger-Record {
  font: inherit;
  margin: 0.5em;
  white-space: pre-wrap;
  word-break: break-word;
}

.OSLogger-RecordContent {
  box-decoration-break: clone;
  border-radius: 0.25em;
  padding: 0 0.25em;

  color: black;
  background-color: white;
}

.OSLogger-Record_type_debug .OSLogger-RecordContent {
  color: grey;
}

.OSLogger-Record_type_warn .OSLogger-RecordContent {
  color: brown;
  background-color: cornsilk;
}

.OSLogger-Record_type_error .OSLogger-RecordContent {
  color: darkred;
  background-color: pink;
}

.OSLogger-Number {
  color: darkgreen;
}

.OSLogger-Group > :first-child {
  margin-left: 0.5em;
}

.OSLogger-Group {
  position: relative;
  margin-left: 0;
}

.OSLogger-Group::before, .OSLogger-Group::after {
  content: '';
  display: block;
  width: 0.125em;
  position: absolute;
  z-index: -1;
  inset: 0.5em auto 0.25em 0.625em;
  background-color: black;
}

.OSLogger-Group::after {
  inset: 0.5em auto 0.25em 0.5em;
  background-color: white;
}

.OSLogger-Group > :not(:first-child) {
  margin-left: 1.5em;
}

.OSLogger-Group > .OSLogger-Group:not(:first-child) {
  margin-left: 1em;
}

.OSLogger-Table {
  background-color: white;
  border-radius: 0.25em;
  margin: 0.5em;
  cellpadding: 0px;
  cellspacng: 0px;
  border: none;
  border-spacing: 0;
}

.OSLogger-Table :is(td, th) {
  padding: 0 0.25em;
}

.OSLogger-Table th {
  font-weight: bold;
}

:where(.OSLogger-Table :is(td, th)) {
  color: black;
  font: inherit;
}

.OSLogger-Table th {
  text-align: left;
}

.OSLogger-Table td.OSLogger-Number {
  text-align: right;
}
`;

  const regEscape =
    RegExp.escape?.bind(RegExp) ??
    ((str) => str.replace(/[\\+*?[^\]$(){}=!<>|:\-#]/g, "\\$&"));
  const loggerRoot = Object.assign(document.createElement("div"), {
    className: "OSLogger",
    inert: true,
  });
  const original = { ...console };
  const counts = Object.create(null);
  const timers = Object.create(null);
  let slot = loggerRoot;

  const scrollToBottom = () => loggerRoot.scroll(0, loggerRoot.scrollHeight);
  const round1000 = (num) => Math.round(num * 1000) / 1000;
  const isCollection = (obj) =>
    Array.isArray(obj) ||
    obj instanceof Set ||
    obj instanceof Map ||
    String(obj) === "[object Object]";
  const getView = (arg, unsupported) => {
    if (arg === null) {
      return ["null", "Null"];
    } else if (arg === undefined) {
      return ["undefined", "Undefined"];
    } else if (arg instanceof Error) {
      return [`${String(arg)}${getTraceToOSLogger()}`, "Error"];
    } else if (Array.isArray(arg)) {
      return [JSON.stringify(arg), "Array"];
    } else if (typeof arg === "string") {
      return [unsupported ? JSON.stringify(arg) : arg, "String"];
    } else if (typeof arg === "number") {
      return [arg, "Number"];
    } else if (
      typeof arg?.toString !== "function" ||
      String(arg) === "[object Object]"
    ) {
      return [JSON.stringify(arg), "Object"];
    } else {
      return [String(arg), "Object"];
    }
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

      const [textContent, type] = getView(arg, unsupported);
      content.appendChild(
        Object.assign(document.createElement("span"), {
          className: `OSLogger-${type}`,
          textContent,
        })
      );
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

  const getTraceToOSLogger = () => {
    try {
      throw new Error();
    } catch (e) {
      const lines = e.stack.split("\n");
      const finalStack = [];
      const hasTrace = /\bgetTraceToOSLogger\b/;
      const fileUrl = /(\bhttps?:\/\/.*?):\d+:\d+\b/;
      let isExternal = false;
      let thisFile;

      lines.forEach((line) => {
        if (!thisFile) {
          if (hasTrace.test(line)) {
            thisFile = fileUrl.exec(line)?.[1];
          }

          return;
        }

        if (isExternal || !line.includes(thisFile)) {
          finalStack.push(line.replaceAll(`${window.location.origin}/`, ""));

          isExternal = true;
        }
      });

      return `\n${finalStack.join("\n")}`;
    }
  };

  Object.assign(
    console,
    Object.fromEntries(
      Object.entries(original).map(([funcName, func]) => [
        funcName,
        (...args) => {
          print(args, { unsupported: funcName });
          func.apply(console, args);
        },
      ])
    ),
    {
      log: (...args) => {
        print(args, { type: "log" });
        original.log?.apply(console, args);
      },
      info: (...args) => {
        print(args, { type: "info" });
        original.info?.apply(console, args);
      },
      debug: (...args) => {
        print(args, { type: "debug" });
        original.debug?.apply(console, args);
      },
      warn: (...args) => {
        print(args, { type: "warn" });
        original.warn?.apply(console, args);
      },
      error: (...args) => {
        print(args, { type: "error" });
        original.error?.apply(console, args);
      },
      trace: (...args) => {
        print(
          args.length
            ? [...args, getTraceToOSLogger()]
            : ["console.trace", getTraceToOSLogger()]
        );
        original.trace?.apply(console, args);
      },
      assert: (...args) => {
        const [flag, ...rest] = args;
        if (!flag) {
          print(["Assertion failed:", ...rest, getTraceToOSLogger()], {
            type: "error",
          });
        }
        original.assert?.apply(console, args);
      },
      clear: (...args) => {
        loggerRoot.textContent = "";
        slot = loggerRoot;
        original.clear?.apply(console, args);
      },
      count: (...args) => {
        const label = args[0] ?? "dafault";
        counts[label] = (counts[label] ?? 0) + 1;
        print([`${label}:`, counts[label]]);
        original.count?.apply(console, args);
      },
      countReset: (...args) => {
        const label = args[0] ?? "dafault";
        if (counts[label] === undefined) {
          print([`Counter "${label}" doesn't exist`], { type: "warn" });
        } else {
          counts[label] = 0;
          print([`${label}:`, counts[label]]);
        }
        original.countReset?.apply(console, args);
      },
      time: (...args) => {
        const label = args[0] ?? "dafault";
        if (timers[label] !== undefined) {
          print([`Timer "${label}" already exists`], { type: "warn" });
        } else {
          timers[label] = performance.now();
        }
        original.time?.apply(console, args);
      },
      timeLog: (...args) => {
        timeLog(args[0]);
        original.timeLog?.apply(console, args);
      },
      timeEnd: (...args) => {
        timeLog(args[0], true);
        original.timeEnd?.apply(console, args);
      },
      group: (...args) => {
        group(args[0]);
        original.group?.apply(console, args);
      },
      groupCollapsed: (...args) => {
        group(args[0], true);
        original.groupCollapsed?.apply(console, args);
      },
      groupEnd: (...args) => {
        if (slot !== loggerRoot) {
          slot = slot.parentElement;
        }
        original.groupEnd?.apply(console, args);
      },
      table: (...args) => {
        let [data, keys] = args;
        if (data instanceof Set) {
          data = Array.from(data);
        }
        if (data instanceof Map) {
          data = Array.from(data).map(([k, v]) => ({
            "(key)": k,
            "(value)": v,
          }));
        }
        if (!isCollection(data)) {
          print([data]);
          scrollToBottom();
          original.table?.apply(console, args);

          return;
        }
        const table = Object.assign(document.createElement("table"), {
          className: "OSLogger-Table",
        });
        const tHead = document.createElement("thead");
        const tBody = document.createElement("tbody");
        table.append(tHead, tBody);
        const tHeadTr = document.createElement("tr");
        tHead.appendChild(tHeadTr);

        const INDEX = {};
        const VALUE = {};

        const keysSet = new Set([INDEX, ...(keys ?? [])]);
        let withValue = false;

        tHeadTr.append(
          ...Array.from(keysSet).map((key) =>
            Object.assign(document.createElement("th"), {
              textContent: key === INDEX ? "(index)" : key,
            })
          )
        );

        Object.entries(data).forEach(([index, row]) => {
          const tr = document.createElement("tr");
          tBody.appendChild(tr);

          tr.append(
            ...Array.from(keysSet).map((key) => {
              if (key === INDEX) {
                const [textContent, type] = getView(index);
                return Object.assign(document.createElement("td"), {
                  className: `OSLogger-${
                    Array.isArray(data) ? "Number" : type
                  }`,
                  textContent,
                });
              }
              if (key === VALUE) {
                if (isCollection(row)) {
                  return document.createElement("td");
                }
                const [textContent, type] = getView(row);
                return Object.assign(document.createElement("td"), {
                  className: `OSLogger-${type}`,
                  textContent,
                });
              }
              if (!isCollection(row) || !Object.hasOwnProperty.call(row, key)) {
                return document.createElement("td");
              }
              const [textContent, type] = getView(row[key]);
              return Object.assign(document.createElement("td"), {
                className: `OSLogger-${type}`,
                textContent,
              });
            })
          );

          if (keys) {
            return;
          }

          if (isCollection(row)) {
            Object.keys(row).forEach((key) => {
              if (keysSet.has(key)) {
                return;
              }
              keysSet.add(key);
              tHeadTr.appendChild(
                Object.assign(document.createElement("th"), {
                  textContent: key,
                })
              );
              const [textContent, type] = getView(row[key]);
              tr.appendChild(
                Object.assign(document.createElement("td"), {
                  className: `OSLogger-${type}`,
                  textContent,
                })
              );
            });

            return;
          }

          if (withValue) {
            return;
          }

          keysSet.add(VALUE);
          withValue = true;
          tHeadTr.appendChild(
            Object.assign(document.createElement("th"), {
              textContent: "(value)",
            })
          );
          const [textContent, type] = getView(row);
          tr.appendChild(
            Object.assign(document.createElement("td"), {
              className: `OSLogger-${type}`,
              textContent,
            })
          );
        });

        slot.appendChild(table);
        scrollToBottom();

        original.table?.apply(console, args);
      },
    }
  );

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
          new RegExp(`^${regEscape(window.location.origin)}/`),
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
          new RegExp(
            `^${regEscape(String(reason))}\n|${regEscape(
              window.location.origin
            )}/`,
            "g"
          ),
          ""
        )}`,
      ],
      {
        type: "error",
      }
    );
  });
})();
