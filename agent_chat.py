"""
Preventive Medicine Valet — Multi-Agent Discussion Interface

Uses the locally installed CLI tools (Claude Code, Gemini CLI, Codex)
in headless/non-interactive mode to hold a group architecture discussion.
No API keys or Python packages needed — just the CLIs on your PATH.
"""

import ctypes
import os
import queue
import re
import subprocess
import sys
import threading
import traceback
from datetime import datetime
from pathlib import Path

import tkinter as tk
from tkinter import messagebox, filedialog

# ═══════════════════════════════════════════════════════════════
#  DPI (crisp text on Windows 11 high-DPI screens)
# ═══════════════════════════════════════════════════════════════
try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except Exception:
    try:
        ctypes.windll.user32.SetProcessDPIAware()
    except Exception:
        pass

# ═══════════════════════════════════════════════════════════════
#  CONSTANTS
# ═══════════════════════════════════════════════════════════════

ROOT = Path(__file__).resolve().parent
CONTEXT_FILES = ["CLAUDE.md", "GEMINI.md", "PLAN.md"]

THEME = {
    "bg":      "#1a1b26",  "bg2":     "#24283b",
    "fg":      "#c0caf5",  "dim":     "#565f89",
    "border":  "#3b4261",  "entry":   "#1f2335",
    "btn":     "#3d59a1",  "green":   "#16a34a",
    "claude":  "#bb9af7",  "gemini":  "#7aa2f7",
    "codex":   "#9ece6a",  "system":  "#e0af68",
    "error":   "#f7768e",  "user":    "#7dcfff",
}

AGENTS = [
    {"name": "Claude Code", "cli": "claude",  "color": "claude"},
    {"name": "Gemini CLI",  "cli": "gemini",  "color": "gemini"},
    {"name": "Codex",       "cli": "codex",   "color": "codex"},
]

DEFAULT_TOPIC = (
    "Discuss and reach agreement on the concrete project structure, "
    "technology stack, folder organization, data models, and implementation "
    "priorities for the Preventive Medicine Valet project."
)

CLI_TIMEOUT = 300  # 5 minutes per agent turn


# ═══════════════════════════════════════════════════════════════
#  HELPERS
# ═══════════════════════════════════════════════════════════════

_ANSI_RE = re.compile(r"\x1b\[[0-9;]*[a-zA-Z]")

def strip_ansi(text: str) -> str:
    return _ANSI_RE.sub("", text)


def check_cli(name: str) -> bool:
    """Return True if a CLI tool is on PATH."""
    try:
        result = subprocess.run(
            ["where", name], capture_output=True, text=True, timeout=5,
        )
        return result.returncode == 0
    except Exception:
        return False


def load_project_context() -> str:
    parts = []
    for fname in CONTEXT_FILES:
        p = ROOT / fname
        if p.exists():
            parts.append(f"### {fname}\n```\n{p.read_text(encoding='utf-8')}\n```")
    return "\n\n".join(parts) if parts else "(No project files found.)"


def build_prompt(agent_name: str, project_ctx: str, topic: str,
                 transcript: str, is_consensus: bool = False) -> str:
    """Build the full prompt sent via stdin to the CLI."""
    role_block = (
        f"You are {agent_name}, a senior software architect participating "
        f"in a multi-agent design discussion with two other AI architects.\n\n"
        f"RULES:\n"
        f"- Propose concrete, specific technical decisions.\n"
        f"- Respond to other agents by name. Build on good ideas; push back on weak ones.\n"
        f"- Keep responses focused: 300 words max.\n"
        f"- Use markdown for code blocks and folder trees.\n"
        f"- Explicitly state agreement when you agree.\n"
        f"- This is a PREVENTIVE medicine tool: no diagnosis, no prescriptions.\n"
        f"- Move toward a concrete, implementable consensus.\n"
        f"- Do NOT use tools, edit files, or run commands. Just respond with text.\n"
    )

    sections = [
        f"=== YOUR ROLE ===\n{role_block}",
        f"=== PROJECT CONTEXT ===\n{project_ctx}",
        f"=== DISCUSSION TOPIC ===\n{topic}",
    ]

    if transcript:
        sections.append(f"=== CONVERSATION SO FAR ===\n{transcript}")

    if is_consensus:
        sections.append(
            "=== CONSENSUS PHASE ===\n"
            "Provide your FINAL summary:\n"
            "1. **AGREED POINTS** - what the group has converged on\n"
            "2. **FINAL PROJECT STRUCTURE** - concrete folder tree\n"
            "3. **TECH STACK** - final technology choices\n"
            "4. **IMPLEMENTATION ORDER** - priority-ranked phases\n"
            "5. **OPEN QUESTIONS** - unresolved items\n"
            "6. **YOUR VERDICT**: AGREE / PARTIALLY AGREE / DISAGREE (with reason)\n"
        )
    elif transcript:
        sections.append(
            f"=== YOUR TURN ({agent_name}) ===\n"
            f"Respond to the discussion. Address specific points made by others."
        )
    else:
        sections.append(
            f"=== YOUR TURN ({agent_name}) ===\n"
            f"You speak first. Present your architectural vision: "
            f"folder structure, tech stack, key modules, and priorities."
        )

    return "\n\n".join(sections)


# ═══════════════════════════════════════════════════════════════
#  CLI CALLERS
# ═══════════════════════════════════════════════════════════════

def call_claude(prompt: str, proc_holder: list) -> str:
    """claude -p  (reads prompt from stdin, prints response)"""
    proc = subprocess.Popen(
        ["claude", "-p", "--verbose"],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        text=True, encoding="utf-8", cwd=str(ROOT),
    )
    proc_holder.append(proc)
    try:
        stdout, stderr = proc.communicate(input=prompt, timeout=CLI_TIMEOUT)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.communicate()
        raise RuntimeError("Claude Code timed out")
    finally:
        if proc in proc_holder:
            proc_holder.remove(proc)

    out = strip_ansi(stdout).strip()
    if not out:
        err = strip_ansi(stderr).strip()
        if err:
            raise RuntimeError(err[:600])
        raise RuntimeError("Claude Code returned empty output")
    return out


def call_gemini(prompt: str, proc_holder: list) -> str:
    """gemini -p "respond"  with full prompt on stdin"""
    proc = subprocess.Popen(
        ["gemini", "-p", "Provide your architectural response now."],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        text=True, encoding="utf-8", cwd=str(ROOT),
    )
    proc_holder.append(proc)
    try:
        stdout, stderr = proc.communicate(input=prompt, timeout=CLI_TIMEOUT)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.communicate()
        raise RuntimeError("Gemini CLI timed out")
    finally:
        if proc in proc_holder:
            proc_holder.remove(proc)

    out = strip_ansi(stdout).strip()
    if not out:
        err = strip_ansi(stderr).strip()
        if err:
            raise RuntimeError(err[:600])
        raise RuntimeError("Gemini CLI returned empty output")
    return out


def call_codex(prompt: str, proc_holder: list) -> str:
    """codex exec -  (reads prompt from stdin)"""
    proc = subprocess.Popen(
        ["codex", "exec", "-"],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        text=True, encoding="utf-8", cwd=str(ROOT),
    )
    proc_holder.append(proc)
    try:
        stdout, stderr = proc.communicate(input=prompt, timeout=CLI_TIMEOUT)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.communicate()
        raise RuntimeError("Codex timed out")
    finally:
        if proc in proc_holder:
            proc_holder.remove(proc)

    out = strip_ansi(stdout).strip()
    if not out:
        err = strip_ansi(stderr).strip()
        if err:
            raise RuntimeError(err[:600])
        raise RuntimeError("Codex returned empty output")
    return out


CALLERS = {
    "Claude Code": call_claude,
    "Gemini CLI":  call_gemini,
    "Codex":       call_codex,
}


# ═══════════════════════════════════════════════════════════════
#  APPLICATION
# ═══════════════════════════════════════════════════════════════

class AgentChatApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Preventive Medicine Valet \u2014 Agent Discussion")
        self.geometry("1120x840")
        self.configure(bg=THEME["bg"])
        self.minsize(860, 620)

        # state
        self.project_ctx = load_project_context()
        self.available: dict[str, bool] = {}
        for meta in AGENTS:
            self.available[meta["name"]] = check_cli(meta["cli"])
        self.messages: list[dict] = []
        self.msg_queue: queue.Queue = queue.Queue()
        self.running = False
        self.proc_holder: list = []  # holds active subprocess for cancellation
        self.thread: threading.Thread | None = None

        self._build_header()
        self._build_chat()
        self._build_user_input()
        self._build_controls()
        self._poll_queue()

    # ── UI ────────────────────────────────────────────────────

    def _build_header(self):
        hdr = tk.Frame(self, bg=THEME["bg2"], padx=12, pady=10)
        hdr.pack(fill="x")
        tk.Label(
            hdr,
            text="\u2695  PM Valet \u2014 Multi-Agent Architecture Discussion",
            font=("Segoe UI", 14, "bold"),
            fg=THEME["fg"], bg=THEME["bg2"],
        ).pack(side="left")

        self.dots: dict[str, tk.Label] = {}
        dot_frame = tk.Frame(hdr, bg=THEME["bg2"])
        dot_frame.pack(side="right")
        for meta in AGENTS:
            f = tk.Frame(dot_frame, bg=THEME["bg2"])
            f.pack(side="left", padx=8)
            ok = self.available[meta["name"]]
            dot = tk.Label(
                f, text="\u25cf", font=("Segoe UI", 13),
                fg=THEME[meta["color"]] if ok else THEME["dim"],
                bg=THEME["bg2"],
            )
            dot.pack(side="left")
            status = "" if ok else " (not found)"
            tk.Label(
                f, text=f" {meta['name']}{status}", font=("Segoe UI", 10),
                fg=THEME["fg"] if ok else THEME["dim"], bg=THEME["bg2"],
            ).pack(side="left")
            self.dots[meta["name"]] = dot

    def _build_chat(self):
        frame = tk.Frame(self, bg=THEME["bg"])
        frame.pack(fill="both", expand=True, padx=12, pady=(8, 4))

        self.chat = tk.Text(
            frame, wrap="word", font=("Consolas", 11),
            bg=THEME["bg"], fg=THEME["fg"],
            insertbackground=THEME["fg"], selectbackground=THEME["btn"],
            relief="flat", padx=14, pady=10, borderwidth=0,
            state="disabled", spacing3=4,
        )
        sb = tk.Scrollbar(frame, command=self.chat.yview,
                          bg=THEME["bg2"], troughcolor=THEME["bg"])
        self.chat.configure(yscrollcommand=sb.set)
        sb.pack(side="right", fill="y")
        self.chat.pack(side="left", fill="both", expand=True)

        # text tags for colors
        for meta in AGENTS:
            self.chat.tag_config(
                f"{meta['name']}_name",
                foreground=THEME[meta["color"]],
                font=("Consolas", 11, "bold"),
            )
            self.chat.tag_config(f"{meta['name']}_body",
                                 foreground=THEME["fg"], lmargin2=20)
        self.chat.tag_config("system", foreground=THEME["system"],
                             font=("Consolas", 10, "italic"))
        self.chat.tag_config("error", foreground=THEME["error"],
                             font=("Consolas", 10, "bold"))
        self.chat.tag_config("sep", foreground=THEME["dim"])
        self.chat.tag_config("user_name", foreground=THEME["user"],
                             font=("Consolas", 11, "bold"))
        self.chat.tag_config("user_body", foreground=THEME["fg"], lmargin2=20)

    def _build_user_input(self):
        frame = tk.Frame(self, bg=THEME["bg"])
        frame.pack(fill="x", padx=12, pady=(0, 4))

        self.user_entry = tk.Entry(
            frame, font=("Consolas", 11), bg=THEME["entry"],
            fg=THEME["fg"], insertbackground=THEME["fg"], relief="flat",
        )
        self.user_entry.pack(side="left", fill="x", expand=True, ipady=7)
        self.user_entry.insert(0, "Inject a message into the discussion...")
        self.user_entry.config(fg=THEME["dim"])
        self.user_entry.bind("<FocusIn>", self._on_entry_focus)
        self.user_entry.bind("<FocusOut>", self._on_entry_blur)
        self.user_entry.bind("<Return>", lambda e: self._inject_message())

        tk.Button(
            frame, text="Send", font=("Segoe UI", 10),
            bg=THEME["btn"], fg=THEME["fg"], relief="flat",
            activebackground=THEME["border"], cursor="hand2",
            padx=18, pady=5, command=self._inject_message,
        ).pack(side="right", padx=(8, 0))

    def _build_controls(self):
        ctrl = tk.Frame(self, bg=THEME["bg2"], pady=10)
        ctrl.pack(fill="x", side="bottom")

        # Topic
        row1 = tk.Frame(ctrl, bg=THEME["bg2"])
        row1.pack(fill="x", padx=16, pady=(0, 8))
        tk.Label(row1, text="Topic:", font=("Segoe UI", 10),
                 fg=THEME["dim"], bg=THEME["bg2"]).pack(side="left")
        self.topic_entry = tk.Entry(
            row1, font=("Segoe UI", 10), bg=THEME["entry"],
            fg=THEME["fg"], insertbackground=THEME["fg"], relief="flat",
        )
        self.topic_entry.insert(0, DEFAULT_TOPIC)
        self.topic_entry.pack(side="left", fill="x", expand=True,
                              padx=(8, 0), ipady=4)

        # Buttons
        row2 = tk.Frame(ctrl, bg=THEME["bg2"])
        row2.pack(fill="x", padx=16)

        tk.Label(row2, text="Rounds:", font=("Segoe UI", 10),
                 fg=THEME["dim"], bg=THEME["bg2"]).pack(side="left")
        self.rounds_var = tk.StringVar(value="3")
        tk.Spinbox(
            row2, from_=1, to=10, textvariable=self.rounds_var,
            width=3, font=("Segoe UI", 10), bg=THEME["entry"],
            fg=THEME["fg"], buttonbackground=THEME["border"], relief="flat",
        ).pack(side="left", padx=(4, 16))

        self.start_btn = tk.Button(
            row2, text="\u25b6  Start Discussion",
            font=("Segoe UI", 10, "bold"),
            bg=THEME["green"], fg="white", relief="flat",
            activebackground="#15803d", cursor="hand2",
            padx=18, pady=5, command=self._start,
        )
        self.start_btn.pack(side="left", padx=(0, 8))

        self.stop_btn = tk.Button(
            row2, text="\u25a0  Stop", font=("Segoe UI", 10),
            bg=THEME["error"], fg="white", relief="flat",
            cursor="hand2", padx=18, pady=5,
            command=self._stop, state="disabled",
        )
        self.stop_btn.pack(side="left", padx=(0, 8))

        tk.Button(
            row2, text="Export", font=("Segoe UI", 10),
            bg=THEME["btn"], fg=THEME["fg"], relief="flat",
            cursor="hand2", padx=14, pady=5, command=self._export,
        ).pack(side="left", padx=(0, 8))

        # Status
        self.status_var = tk.StringVar(value="Ready")
        avail = [m["name"] for m in AGENTS if self.available[m["name"]]]
        missing = [m["name"] for m in AGENTS if not self.available[m["name"]]]
        status_parts = [f"CLIs found: {', '.join(avail) if avail else 'none'}"]
        if missing:
            status_parts.append(f"Missing: {', '.join(missing)}")
        self.status_var.set(" | ".join(status_parts))
        tk.Label(
            ctrl, textvariable=self.status_var, font=("Consolas", 10),
            fg=THEME["dim"], bg=THEME["bg2"], anchor="w",
        ).pack(fill="x", padx=16, pady=(8, 0))

    # ── Chat helpers ──────────────────────────────────────────

    def _chat_write(self, text: str, tag: str):
        self.chat.config(state="normal")
        self.chat.insert("end", text, tag)
        self.chat.see("end")
        self.chat.config(state="disabled")

    def _show_agent(self, name: str, text: str):
        self._chat_write(f"\n{name}:\n", f"{name}_name")
        self._chat_write(f"{text}\n", f"{name}_body")

    def _show_system(self, text: str):
        self._chat_write(f"\n{text}\n", "system")

    def _show_error(self, text: str):
        self._chat_write(f"\n{text}\n", "error")

    def _show_sep(self, label: str):
        line = "\u2500" * 60
        self._chat_write(f"\n{line}\n  {label}\n{line}\n", "sep")

    def _show_user(self, text: str):
        self._chat_write("\nYou:\n", "user_name")
        self._chat_write(f"{text}\n", "user_body")

    # ── Placeholder handling ──────────────────────────────────

    def _on_entry_focus(self, event):
        if self.user_entry.get().startswith("Inject a message"):
            self.user_entry.delete(0, "end")
            self.user_entry.config(fg=THEME["fg"])

    def _on_entry_blur(self, event):
        if not self.user_entry.get().strip():
            self.user_entry.insert(0, "Inject a message into the discussion...")
            self.user_entry.config(fg=THEME["dim"])

    # ── Queue polling ─────────────────────────────────────────

    def _poll_queue(self):
        while not self.msg_queue.empty():
            try:
                action, *args = self.msg_queue.get_nowait()
            except queue.Empty:
                break

            if action == "agent":
                self._show_agent(args[0], args[1])
            elif action == "system":
                self._show_system(args[0])
            elif action == "error":
                self._show_error(args[0])
            elif action == "sep":
                self._show_sep(args[0])
            elif action == "status":
                self.status_var.set(args[0])
            elif action == "done":
                self._on_done()

        self.after(80, self._poll_queue)

    # ── User message injection ────────────────────────────────

    def _inject_message(self):
        text = self.user_entry.get().strip()
        if not text or text.startswith("Inject a message"):
            return
        self.user_entry.delete(0, "end")
        self.messages.append({"agent": "User", "content": text})
        self._show_user(text)

    # ── Discussion control ────────────────────────────────────

    def _get_active_agents(self) -> list[dict]:
        return [m for m in AGENTS if self.available[m["name"]]]

    def _start(self):
        active = self._get_active_agents()
        if len(active) < 2:
            messagebox.showwarning(
                "Not Enough Agents",
                f"At least 2 CLI tools must be installed.\n\n"
                f"Found: {', '.join(m['name'] for m in active) or 'none'}\n\n"
                f"Install the missing CLIs and restart.",
            )
            return

        self.running = True
        self.messages.clear()
        self.chat.config(state="normal")
        self.chat.delete("1.0", "end")
        self.chat.config(state="disabled")
        self.start_btn.config(state="disabled")
        self.stop_btn.config(state="normal")

        rounds = int(self.rounds_var.get())
        topic = self.topic_entry.get().strip() or DEFAULT_TOPIC

        self.thread = threading.Thread(
            target=self._discussion_loop,
            args=(active, rounds, topic),
            daemon=True,
        )
        self.thread.start()

    def _stop(self):
        self.running = False
        # Kill any running subprocess immediately
        for proc in list(self.proc_holder):
            try:
                proc.kill()
            except Exception:
                pass
        self.msg_queue.put(("status", "Stopped."))

    def _on_done(self):
        self.running = False
        self.start_btn.config(state="normal")
        self.stop_btn.config(state="disabled")

    # ── Discussion thread ─────────────────────────────────────

    def _format_transcript(self) -> str:
        if not self.messages:
            return ""
        lines = []
        for m in self.messages:
            lines.append(f"**{m['agent']}**: {m['content']}")
        return "\n\n".join(lines)

    def _discussion_loop(self, agents: list[dict], rounds: int, topic: str):
        q = self.msg_queue
        ctx = self.project_ctx
        names = ", ".join(a["name"] for a in agents)

        q.put(("system", f"Discussion started with {len(agents)} agents: {names}"))
        q.put(("system", f"Topic: {topic}"))
        q.put(("system", f"Using {rounds} rounds + consensus phase"))
        q.put(("system", f"Each agent may take 30-120 seconds to respond..."))
        q.put(("sep", "DISCUSSION BEGINS"))

        # ── Main rounds ──
        for rnd in range(1, rounds + 1):
            if not self.running:
                break
            q.put(("sep", f"ROUND {rnd} of {rounds}"))

            for agent in agents:
                if not self.running:
                    break

                name = agent["name"]
                q.put(("status",
                       f"Round {rnd}/{rounds} \u2014 {name} is thinking..."))

                transcript = self._format_transcript()
                prompt = build_prompt(name, ctx, topic, transcript)
                caller = CALLERS[name]

                try:
                    response = caller(prompt, self.proc_holder)
                    self.messages.append({"agent": name, "content": response})
                    q.put(("agent", name, response))
                except Exception as exc:
                    err = f"[{name} error] {exc}"
                    self.messages.append({"agent": name, "content": err})
                    q.put(("error", err))

        # ── Consensus phase ──
        if self.running:
            q.put(("sep", "CONSENSUS PHASE"))
            transcript = self._format_transcript()

            for agent in agents:
                if not self.running:
                    break
                name = agent["name"]
                q.put(("status", f"Consensus \u2014 {name} is summarizing..."))
                prompt = build_prompt(name, ctx, topic, transcript,
                                      is_consensus=True)
                caller = CALLERS[name]
                try:
                    response = caller(prompt, self.proc_holder)
                    tagged = f"[CONSENSUS]\n{response}"
                    self.messages.append({"agent": name, "content": tagged})
                    q.put(("agent", name, tagged))
                except Exception as exc:
                    q.put(("error", f"[{name} consensus error] {exc}"))

        q.put(("sep", "DISCUSSION COMPLETE"))
        q.put(("status", "Discussion complete. Export or start a new one."))
        q.put(("done",))

    # ── Export ────────────────────────────────────────────────

    def _export(self):
        if not self.messages:
            messagebox.showinfo("Export", "No discussion to export yet.")
            return

        path = filedialog.asksaveasfilename(
            defaultextension=".md",
            filetypes=[("Markdown", "*.md"), ("Text", "*.txt")],
            initialfile=f"agent_discussion_{datetime.now():%Y%m%d_%H%M}.md",
            initialdir=str(ROOT),
        )
        if not path:
            return

        lines = [
            f"# Multi-Agent Architecture Discussion",
            f"**Date:** {datetime.now():%Y-%m-%d %H:%M}",
            f"**Topic:** {self.topic_entry.get()}",
            f"**Agents:** {', '.join(m['name'] for m in AGENTS if self.available[m['name']])}",
            "",
            "---",
        ]
        for m in self.messages:
            lines.append(f"\n### {m['agent']}\n\n{m['content']}")
        lines.append("")

        Path(path).write_text("\n".join(lines), encoding="utf-8")
        self.status_var.set(f"Exported to {Path(path).name}")


# ═══════════════════════════════════════════════════════════════
#  ENTRY POINT
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    app = AgentChatApp()
    app.mainloop()
