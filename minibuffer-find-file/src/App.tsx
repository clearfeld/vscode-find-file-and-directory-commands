import { useState, React, useEffect, useRef } from "react";
import { DebugConsoleMode } from "vscode";
// import reactLogo from "./assets/react.svg";
import "./App.css";
import Fuse from "fuse.js";

// TODO: shift enter should create file regardless of index choice
// TODO: clean up code and move this to a webviews folder instead

// TODO: highlight search match range in name portion similar to emacs
// TODO: Add fuzzy search option possibly with fusejs
// const FUSE_OPTIONS = {
//   isCaseSensitive: false,
//   // includeScore: false,
//   shouldSort: false,
//   includeMatches: true,
//   // findAllMatches: false,
//   // minMatchCharLength: 1,
//   // location: 0,
//   threshold: 0.3, // Probably should make this a configuration option 0 for exact match upto 1 for fuzziness upto taste
//   // distance: 100,
//   // useExtendedSearch: false,
//   // ignoreLocation: false,
//   // ignoreFieldNorm: false,
//   // fieldNormWeight: 1,
//   keys: [
//     "name",
//   ]
// };

// @ts-ignore
const vscode = acquireVsCodeApi();

function App() {
  const inputRef = useRef(null);

  const [dirDataRaw, setDirDataRaw] = useState(null);
  const [dirData, setDirData] = useState(null);
  const [dirDataFiltered, setDirDataFiltered] = useState(null);

  const currentDir = useRef<string>("");

  const [lengthLongestFileOrDirectory, setLengthLongestFileOrDirectory] =
    useState<number>(-1);

  // const [fuseInstance, setFuseInstance] = useState<any>(null);

  const [indexChoice, setIndexChoice] = useState<number>(0);
  const [iv, setIV] = useState<string>("");

  useEffect(() => {
    window.addEventListener("message", HandleMessages);

    return () => {
      window.addEventListener("message", HandleMessages);
    };
  }, []);

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
          setDirDataRaw(x);
          // console.log("Current Dir - ", currentDir);
          if (currentDir.current === "") {
            // console.log("Set working dir");
            currentDir.current = x[0];
          }
          ParseDirData(x);
        }
        break;

      case "directory_change":
        {
          setIndexChoice(0);

          console.log(
            "directory_change event.data.directory - ",
            event.data.directory
          );

          if (
            event.data.directory !== null &&
            event.data.directory !== undefined
          ) {
            let p = JSON.parse(event.data.directory);
            console.log(p);
            currentDir.current = JSON.parse(event.data.directory);
          }

          let x = JSON.parse(event.data.data);
          setDirDataRaw(x);
          // console.log("Current Dir - ", currentDir);
          if (currentDir.current === "") {
            // console.log("Set working dir");
            currentDir.current = x[0];
          }
          ParseDirData(x, 1);
        }
        break;
    }
  }

  function ParseDirData(dirDataRaw, offset_lines: number = 0) {
    let x = [];
    const ddrl = dirDataRaw.length;

    for (let i = 0; i < ddrl; ++i) {
      const dir_line_str = dirDataRaw[i].replace(/\s+/g, " ").trim();
      const name_split_idx = nthIndex(dir_line_str, " ", 8);

      if (dirDataRaw[i][0] === "d") {
        x.push({
          str: dir_line_str,
          split: dir_line_str.substr(0, name_split_idx).split(" "),
          name: dir_line_str.substr(name_split_idx + 1, dirDataRaw[i].length),
          type: "directory",
        });
      } else {
        x.push({
          str: dir_line_str,
          split: dir_line_str.substr(0, name_split_idx).split(" "),
          name: dir_line_str.substr(name_split_idx + 1, dirDataRaw[i].length),
          type: "file",
        });
      }
    }

    let fdl = -1;
    // find longest file or dir name
    for (let i = 0; i < x.length; ++i) {
      if (x[i].name.length > fdl) {
        fdl = x[i].name.length;
      }
    }
    setLengthLongestFileOrDirectory(fdl);

    x.pop();
    // console.log(x);

    // setFuseInstance(new Fuse(x, FUSE_OPTIONS));

    setDirData(x);
    setDirDataFiltered(x);
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
    // console.log(e.target.value);
    setIV(e.target.value);
    // if (fuseInstance !== null) {
    //   console.log("Fuse res - ", fuseInstance.search(e.target.value));
    // }

    if (e.target.value === "") {
      setDirDataFiltered(dirData);
      setIndexChoice(0);
      window.scrollBy(0, 0);
    } else {
      let x = [];
      for (let i = 0; i < dirData.length; ++i) {
        // console.log(dirData[i].name, e.target.value);
        if (
          dirData[i].name.toLowerCase().includes(e.target.value.toLowerCase())
        ) {
          x.push(dirData[i]);
        }
      }
      setDirDataFiltered(x);
      setIndexChoice(0);
      window.scrollBy(0, 0);
    }
  }

  function InputOnBlur(): void {
    if (inputRef !== null && inputRef.current !== null) {
      inputRef.current.focus();
    }
  }

  function InputOnKeyPress(e): void {
    // console.log("handle key press - ", e.key);
    if (e.key === "Escape") {
      e.preventDefault();
      console.log("Escape was pressed");
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      // console.log("Enter was pressed was presses");

      if (iv.includes(":")) {
        // most likely a change directory attempt
        vscode.postMessage({
          type: "Enter",
          value: iv,
          pick_type: "directory",
        });

        currentDir.current = iv;
        setIV("");
        return;
      }

      let dl = dirDataFiltered[indexChoice];
      if (dl === null || dl === undefined) {
        // likely trying to create a new file
        vscode.postMessage({
          type: "CreateFile",
          // value: currentDir,
          value: iv,
          directory: currentDir.current,
          pick_type: "file",
          // directory: currentDir.current + "\\bin"
        });
        // setIV("");
        return;
      }

      // let dl = dirDataFiltered[indexChoice];
      // console.log(dl);
      let pick_type = "directory";
      if (dl.type === "file") {
        // console.log("Pick file");
        pick_type = "file";
        let n = dl.name;
        currentDir.current = currentDir.current + "\\" + n;
      } else {
        // console.log("Open Dir");
        pick_type = "directory";

        let n = dl.name;
        if (n === "..") {
          let lidx = currentDir.current.lastIndexOf("\\");
          if (lidx === -1) {
            currentDir.current = currentDir.current;
          } else {
            let check = currentDir.current.substr(0, lidx);

            // console.log("Check", check);
            currentDir.current = currentDir.current.substr(0, lidx);

            if (check.includes("\\")) {
              currentDir.current = currentDir.current.substr(0, lidx);
            } else {
              currentDir.current = currentDir.current + "\\";
            }
          }
        } else if (n === ".") {
          currentDir.current = currentDir.current;
        } else {
          if (currentDir.current[currentDir.current.length - 1] !== "\\") {
            currentDir.current = currentDir.current + "\\" + n;
          } else {
            currentDir.current = currentDir.current + n;
          }
        }
      }

      // console.log("Current Dir - ", currentDir.current);

      if (pick_type === "file") {
        vscode.postMessage({
          type: "OpenFile",
          // value: currentDir,
          value: currentDir.current,
          pick_type: pick_type,
          // directory: currentDir.current + "\\bin"
        });
      } else {
        vscode.postMessage({
          type: "Enter",
          // value: currentDir,
          value: currentDir.current,
          pick_type: pick_type,
          // directory: currentDir.current + "\\bin"
        });
      }

      setIV("");
      // currentDir.current = currentDir.current + "\\bin";
    }
  }

  function InputOnKeyDown(e) {
    // console.log(e.keyCode);

    // tab
    if (e.keyCode === 9) {
      e.preventDefault();
      e.stopPropagation();

      let dl = dirDataFiltered[indexChoice];
      let n = dl.name;

      // TODO: handle tab completion closer to emacs
      // auto navgate to dir on tab match

      //let lidx = currentDir.current.lastIndexOf("\\");
      //if (lidx === -1) {
      //  currentDir.current = currentDir.current;
      //} else {
      //  let check = currentDir.current.substr(0, lidx);
      //   // console.log("Check", check);
      //   currentDir.current = currentDir.current.substr(0, lidx);

      //   if (check.includes("\\")) {
      //     currentDir.current = currentDir.current.substr(0, lidx);
      //   } else {
      //     currentDir.current = currentDir.current + "\\";
      //   }
      // }
      setIV(dl.name);

      return;
    } else if (e.keyCode === 38) {
      e.preventDefault();
      if (indexChoice !== 0) {
        setIndexChoice(indexChoice - 1);
        window.scrollBy(0, -14);
      }
    } else if (e.keyCode === 40) {
      e.preventDefault();
      if (indexChoice !== dirDataFiltered.length - 1) {
        setIndexChoice(indexChoice + 1);
        window.scrollBy(0, 14);
      }
    } else if ((e.ctrlKey && e.keyCode === 71) || e.keyCode === 27) {
      // ctrl + g || escape
      e.preventDefault();

      vscode.postMessage({
        type: "Quit",
      });

      return;

      // console.log("Ctrl + G was pressed was presses");
      // console.log("Escape");
    } else if (e.keyCode === 8) {
      // backspace
      if (iv !== "") return;
      e.preventDefault();

      // console.log("Open Dir");

      let dl = dirDataFiltered[indexChoice];
      let n = dl.name;
      let lidx = currentDir.current.lastIndexOf("\\");
      if (lidx === -1) {
        currentDir.current = currentDir.current;
      } else {
        let check = currentDir.current.substr(0, lidx);

        // console.log("Check", check);
        currentDir.current = currentDir.current.substr(0, lidx);

        if (check.includes("\\")) {
          currentDir.current = currentDir.current.substr(0, lidx);
        } else {
          currentDir.current = currentDir.current + "\\";
        }
      }

      // if (currentDir.current[currentDir.current.length - 1] !== "\\") {
      //   currentDir.current = currentDir.current + "\\" + n;
      // } else {
      //   currentDir.current = currentDir.current + n;
      // }

      // console.log("Current Dir - ", currentDir.current);

      vscode.postMessage({
        type: "Enter",
        value: currentDir.current,
        pick_type: "directory",
        // directory: currentDir.current + "\\bin"
      });

      setIV("");

      // console.log("Backspace was pressed was presses");
      // vscode.postMessage({
      //   type: "Enter",
      //   value: iv,
      // });
      // currentDir.current = currentDir.current + "\\bin";
    }
  }

  function GetFileAndDirectoryCount(): string {
    if (dirDataRaw) {
      let count: number = dirDataRaw.length - 3; // 3 - current dir, parent dir, and 1 extra from the length count
      let str = "";
      if (count < 10) return `${count}${str.padEnd(4)}`;
      else if (count < 100) return `${count}${str.padEnd(3)}`;
      else if (count < 1000) return `${count}${str.padEnd(2)}`;
      else if (count < 100000) return `${count}${str.padEnd(1)}`;
    }

    return "";
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
      {dirDataRaw !== null && (
        <div>
          <div className="clearfeld-minibuffer-find-file__input-line">
            <span>{GetFileAndDirectoryCount()}</span>
            <span>Find file: </span>
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

          {dirDataFiltered && (
            <div className="clearfeld-minibuffer-find-file__results-wrapper">
              {dirDataFiltered.map((line, idx: number) => {
                // if (idx < 4 || idx > dirData.length) return;
                // indexChoice

                return (
                  <div
                    key={idx}
                    style={
                      line.type === "file"
                        ? {}
                        : {
                            color:
                              "var(--vscode-symbolIcon-functionForeground)",
                          }
                    }
                    className={
                      "clearfeld-minibuffer-find-file__result-row " +
                      (indexChoice === idx &&
                        "clearfeld-minibuffer-find-file__result-current-selection ")
                    }
                  >
                    {/* <span>{lengthLongestFileOrDirectory}</span> */}
                    <span
                      style={{
                        whiteSpace: "pre",
                      }}
                    >
                      {line.name.padEnd(lengthLongestFileOrDirectory + 2)}
                    </span>
                    {/* <span>{line.split[line.split.length - 2]}</span> */}

                    {/* Permissions */}
                    <pre className="clearfeld-minibuffer-find-file__result-subsegment-pre clearfeld-minibuffer-find-file__result-subsegment-pre-permissions">
                      {line.split[0]}
                    </pre>
                    {/* Size */}

                    {line.type === "file" ? (
                      <pre className="clearfeld-minibuffer-find-file__result-subsegment-pre clearfeld-minibuffer-find-file__result-subsegment-pre-size">
                        {" "}
                        {line.split[1].padStart(4, " ")}{" "}
                        {line.split[2].padStart(2, " ")}{" "}
                      </pre>
                    ) : (
                      <pre className="clearfeld-minibuffer-find-file__result-subsegment-pre clearfeld-minibuffer-find-file__result-subsegment-pre-size">
                        {" "}
                        {"-".padStart(7, "-")}{" "}
                      </pre>
                    )}

                    {/* Date */}
                    <pre className="clearfeld-minibuffer-find-file__result-subsegment-pre clearfeld-minibuffer-find-file__result-subsegment-pre-date">
                      {line.split[3]} {line.split[4]}{" "}
                      {line.split[5].padStart(2, " ")} {line.split[6]}{" "}
                      {line.split[7]}
                    </pre>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
