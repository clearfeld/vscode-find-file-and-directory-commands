import { useState, React, useEffect, useRef } from "react";
import "./App.css";

import { FixedSizeList as List } from "react-window";
import { Fzf } from "fzf";
import { DebugConsoleMode } from "vscode";

// @ts-ignore
const vscode = acquireVsCodeApi();

function App() {
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const [windowDimensions, setWindowDimensions] = useState(
    getWindowDimensions()
  );

  // @ts-ignore
  const css_root = getComputedStyle(window.document.body);
  const line_height =
    parseInt(
      css_root.getPropertyValue("--vscode-editor-font-size").slice(0, -2)
    ) + 2;

  const [dataRaw, setDataRaw] = useState(null);
  const [dataFiltered, setDataFiltered] = useState(null);

  const currentDir = useRef<string>("");

  const [indexChoice, setIndexChoice] = useState<number>(0);
  const [iv, setIV] = useState<string>("");
  const [fzfInstance, setFzfInstance] = useState(null);

  useEffect(() => {
    window.addEventListener("message", HandleMessages);
    window.addEventListener("resize", handleResize);

    return () => {
      window.addEventListener("message", HandleMessages);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  function handleResize() {
    setWindowDimensions(getWindowDimensions());
  }

  function getWindowDimensions() {
    const { innerWidth: width, innerHeight: height } = window;
    return {
      width,
      height,
    };
  }

  function HandleMessages(event) {
    switch (event.data.command) {
      case "refactor":
        {
          // console.log(event.data.data);

          setIndexChoice(0);

          console.log("REFACTOR", event.data);

          console.log("Refactor event.data.directory - ", event.data.directory);
          if (
            event.data.directory !== null &&
            event.data.directory !== undefined
          ) {
            let p = JSON.parse(event.data.directory);
            console.log("RES Data Directory - ", p);
            currentDir.current = JSON.parse(event.data.directory);
          }

          let x = JSON.parse(event.data.data);
          if (x[x.length - 1] === "") {
            // sometimes there's an empty string at the end remove it if found
            x.pop();
          }
          if(x[0] === "") {
            x.shift();

            if (event.data.system === "win32") {
              // parse out actual root file path -- assuming git rev-parse --show-toplevel subsitution
              let cd = x[0].substr(x[0].indexOf(">") + 1, x[0].length);
              cd = cd.substr(2, cd.length - 17).trim();
              currentDir.current = cd.replaceAll("/", "\\");

              x.shift();
            } else {
              currentDir.current = x[0];
              x.shift();
            }
          }

          setDataRaw(x);
          // @ts-ignore
          setFzfInstance(new Fzf(x));
          setDataFiltered(x);
        }
        break;
    }
  }

  function nthIndex(str: string, pat: string, n: number) {
    let L = str.length;
    let i = -1;
    while (n-- && i++ < L) {
      i = str.indexOf(pat, i);
      if (i < 0) {
        break;
      }
    }
    return i;
  }

  function InputOnChange(e) {
    setIV(e.target.value);
    setDataFiltered(fzfInstance.find(e.target.value));
    setIndexChoice(0);
    listRef.current!.scrollToItem(0);
  }

  function InputOnBlur(): void {
    if (inputRef !== null && inputRef.current !== null) {
      inputRef.current.focus();
    }
  }

  function InputOnKeyPress(e): void {
    if (e.key === "Enter") {
      e.preventDefault();

      let dl = dataFiltered[indexChoice];

      let file_path;
      if (typeof dl === "string" || dl instanceof String) {
        file_path = currentDir.current + "\\" + dl;
      } else {
        file_path = currentDir.current + "\\" + dl.item;
      }

      vscode.postMessage({
        type: "OpenFile",
        value: file_path,
      });
    }
  }

  function InputOnKeyDown(e) {
    // console.log(e.keyCode);

    if (e.keyCode === 38) {
      e.preventDefault();
      if (indexChoice !== 0) {
        setIndexChoice(indexChoice - 1);
        listRef.current!.scrollToItem(indexChoice - 1);
      }
    } else if (e.keyCode === 40) {
      e.preventDefault();
      if (indexChoice !== dataFiltered.length - 1) {
        setIndexChoice(indexChoice + 1);
        listRef.current!.scrollToItem(indexChoice + 1);
      }
    } else if ((e.ctrlKey && e.keyCode === 71) || e.keyCode === 27) {
      // ctrl + g || escape
      e.preventDefault();

      vscode.postMessage({
        type: "Quit",
      });

      return;
    }
  }

  function GetCurrentDir(): string {
    let x = currentDir.current;
    if (x[x.length - 1] !== "\\") {
      x += "\\";
    }
    return x;
  }

  return (
    <div className="clearfeld-minibuffer-find-file__root">
      {dataRaw && dataFiltered && (
        <div>
          <div className="clearfeld-minibuffer-find-file__input-line">
            <span>
              {dataFiltered.length}/{dataRaw.length}
            </span>
            <span> Find file: </span>
            <span>{GetCurrentDir()}</span>
            <input
              className="clearfeld-minibuffer-find-file__input"
              ref={inputRef}
              autoFocus={true}
              type="text"
              onBlur={InputOnBlur}
              onChange={InputOnChange}
              onKeyPress={InputOnKeyPress}
              onKeyDown={InputOnKeyDown}
              value={iv}
            />
          </div>

          <List
            style={{
              marginTop: `${line_height + 2}px`,
            }}
            height={windowDimensions.height - (line_height + 6)}
            itemCount={dataFiltered.length}
            itemSize={line_height}
            width={"100%"}
            itemData={dataFiltered}
            ref={listRef}
          >
            {({ index, style, data }) => {
              const line = data[index];

              let fzf_results = false;
              // @ts-ignore
              if (typeof line === "string" || line instanceof String) {
                //
              } else {
                fzf_results = true;
              }

              return (
                <div
                  style={style}
                  className="clearfeld-minibuffer-find-file__results-wrapper"
                >
                  <div
                    className={
                      "clearfeld-minibuffer-find-file__result-row " +
                      (indexChoice === index &&
                        "clearfeld-minibuffer-find-file__result-current-selection ")
                    }
                  >
                    {fzf_results ? (
                      <div>
                        <HighlightChars
                          str={line.item}
                          indices={line.positions}
                        />
                      </div>
                    ) : (
                      <div>{line}</div>
                    )}
                  </div>
                </div>
              );
            }}
          </List>
        </div>
      )}
    </div>
  );
}

const HighlightChars = (props) => {
  const chars = props.str.split("");

  const nodes = chars.map((char: string, i: number) => {
    if (props.indices.has(i)) {
      return (
        <b
          key={i}
          className="clearfeld-minibuffer-find-file__result-row-char-highlight"
        >
          {char}
        </b>
      );
    } else {
      return char;
    }
  });

  return <>{nodes}</>;
};

export default App;
