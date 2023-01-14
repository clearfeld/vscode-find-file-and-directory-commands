# Vscode - More find file and directory commands

## Dependencies
* [lsd](https://github.com/Peltoche/lsd)
* [fd](https://github.com/sharkdp/fd)
* [ripgrep](https://github.com/BurntSushi/ripgrep)
* [fzf](https://github.com/junegunn/fzf)
* [jq](https://github.com/stedolan/jq)

## Find File (emacs styled)

| Find file (panel) | Find File (editor) |
|-|-|
| ![VSCodium_HEBQtZuDzR](https://user-images.githubusercontent.com/49600278/210297042-f2a3ac2b-e553-4be5-961b-92776fcfae30.gif) | ![VSCodium_N4vPPO6Vyr](https://user-images.githubusercontent.com/49600278/210297043-71faa00f-1102-4d3e-a15f-c29b7de5f443.gif) |

### Configuration

| Name | Description |
| - | - |
| `emacs-minibuffer-find-file-commands.defaultDirectory` | Certain views don't provide an underlying directory (ex. startup screen). So this value can be set to have a default directory to start the search from.  |

## FInd File (FD and FZF style fuzz)

| Find File (FD and FZF) | 
| ---------------------- |
| ![VSCodium_fd find filer](https://user-images.githubusercontent.com/49600278/212457148-0d9c8d9b-655e-4ef0-96c2-14759ff0001b.gif) |

### Commands

| Command | Description |
| ------- | ----------- |
| `Find File - FD (Panel)` | fd from directory of active editor |
| `Find File - FD (Editor)` | Editor version of above |
| `Find File - FD from project root (GIT)(Panel)` | fd from the project root (git project root (top-level)) |
| `Find File - FD from project root (GIT)(Editor)` | Editor version of above |

## Find File (ripgrep)

| Find File (Ripgrep) | 
| ---------------------- |
| ![VSCodium ripgrep find file](https://user-images.githubusercontent.com/49600278/212494268-72fca489-7806-4d24-957a-aba33207c9db.gif) |

### Commands

| Command | Description |
| ------- | ----------- |
| `Find File - Ripgrep (rg) (Panel)` | Use ripgrep to search file contents from directory of active editor |
