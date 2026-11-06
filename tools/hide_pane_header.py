"""VS Code Claude Code 확장의 플러그인 패널 윗줄을 숨긴다.

사용:
  python hide_pane_header.py          적용
  python hide_pane_header.py --undo   되돌리기

확장이 업데이트되면 CSS 파일이 교체되므로 다시 실행해야 한다.
비공식 수정이다.
"""
import glob
import os
import re
import shutil
import sys

START = "/* usage-bar-hide-header start */"
END = "/* usage-bar-hide-header end */"


def stylesheet():
    pattern = os.path.expanduser(
        "~/.vscode/extensions/anthropic.claude-code-*/webview/index.css"
    )
    found = sorted(glob.glob(pattern), key=os.path.getmtime)
    if not found:
        sys.exit("Claude Code extension not found")
    return found[-1]


def without_block(css):
    if START not in css:
        return css
    return css[: css.index(START)].rstrip() + "\n"


def suffix(css, name):
    found = set(re.findall(r"\." + name + r"_([A-Za-z0-9-]+)", css))
    if len(found) != 1:
        sys.exit("Stopped: class name changed: " + name)
    return found.pop()


def main():
    path = stylesheet()
    with open(path, encoding="utf-8", newline="") as f:
        css = f.read()
    base = without_block(css)

    if "--undo" in sys.argv:
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(base)
        print("Removed:", path)
        return

    backup = path + ".usage-bar-backup"
    if not os.path.exists(backup):
        shutil.copy2(path, backup)

    tag = suffix(base, "inlinePaneHeader")
    for name in ("inlinePaneTitle", "mark", "icon"):
        if name + "_" + tag not in base:
            sys.exit("Stopped: class not found: " + name)

    root = '[data-engine-panes="inline"]'
    rules = "\n".join(
        [
            START,
            root + "{position:relative}",
            root + " .mark_" + tag + "{display:none}",
            root + " .inlinePaneHeader_" + tag + "{position:absolute;top:0;right:0;"
            "z-index:2;padding:0;margin:0;border:0;background:transparent;min-height:0}",
            root + " .inlinePaneHeader_" + tag + ">.icon_" + tag + ","
            + root + " .inlinePaneTitle_" + tag + "{display:none}",
            END,
        ]
    )
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(base.rstrip() + "\n" + rules + "\n")
    print("Applied:", path)
    print("Class suffix:", tag)


if __name__ == "__main__":
    main()
