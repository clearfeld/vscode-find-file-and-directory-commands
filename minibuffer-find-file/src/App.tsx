import { useState, React, useEffect, useRef } from "react";
// import reactLogo from "./assets/react.svg";
import "./App.css";

// unix command
// ls -al --group-directories-first | tail -n +2 | awk '{print $9 "`" $1 "`" $5 "`" $6" "$7" "$8}'
// parse out the strings with split("`");

// TODO: shift enter should create file regardless of index choice

// TODO: format dates closer to emacs find-file
const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sept",
  "Oct",
  "Nov",
  "Dec",
];

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

          console.log("Refactor event.data.directory - ", event.data.directory);
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
    for (let i = 6 - offset_lines; i < ddrl - 3; ++i) {
      // if win32
      let idx = dirDataRaw[i].lastIndexOf("<DIR>");
      let name;
      if (idx !== -1) {
        name = dirDataRaw[i].substr(idx + 5, dirDataRaw[i].length).trimStart();
        // console.log("name - ", name);
      } else {
        let t = dirDataRaw[i].substr(20).trimStart();
        name = t.substr(t.indexOf(" ") + 1);
        // console.log("name - ", name);
      }

      // TODO: unix

      if (dirDataRaw[i].includes("<DIR>")) {
        x.push({
          str: dirDataRaw[i],
          split: dirDataRaw[i].replace(/\s+/g, " ").trim().split(" "),
          name: name,
          type: "directory",
        });
      } else {
        x.push({
          str: dirDataRaw[i],
          split: dirDataRaw[i].replace(/\s+/g, " ").trim().split(" "),
          name: name,
          type: "file",
        });
      }
    }

    // console.log("X - ", x);

    let fdl = -1;
    // find longest file or dir name
    for (let i = 0; i < x.length; ++i) {
      if (x[i].name.length > fdl) {
        fdl = x[i].name.length;
      }
    }
    setLengthLongestFileOrDirectory(fdl);

    setDirData(x);
    setDirDataFiltered(x);
  }

  function InputOnChange(e) {
    // console.log(e.target.value);
    setIV(e.target.value);

    if (e.target.value === "") {
      setDirDataFiltered(dirData);
      setIndexChoice(0);
      window.scrollBy(0, 0);
    } else {
      let x = [];
      for (let i = 0; i < dirData.length - 1; ++i) {
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
    if(e.keyCode === 9) {
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
      let count: number = dirDataRaw.length - 11;
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

                if (line.type === "file") {
                  return (
                    <div
                      key={idx}
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
                      <span>
                        {line.split[0]} {line.split[1]} {line.split[2]}
                      </span>
                    </div>
                  );
                } else {
                  return (
                    <div
                      key={idx}
                      style={{
                        color: "var(--vscode-symbolIcon-functionForeground)",
                      }}
                      className={
                        "clearfeld-minibuffer-find-file__result-row " +
                        (indexChoice === idx &&
                          "clearfeld-minibuffer-find-file__result-current-selection ")
                      }
                    >
                      <span
                        style={{
                          whiteSpace: "pre",
                        }}
                      >
                        {line.name.padEnd(lengthLongestFileOrDirectory + 2)}
                      </span>
                      {/* <span>{line.split[line.split.length - 2]}</span> */}
                      <span>
                        {line.split[0]} {line.split[1]} {line.split[2]}
                      </span>
                    </div>
                  );
                }
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
