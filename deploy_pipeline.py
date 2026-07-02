#!/usr/bin/env python3
import subprocess
import sys
import os

def run_command(command, cwd=None):
    print(f"[*] Running: {command} ...")
    result = subprocess.run(command, shell=True, cwd=cwd)
    if result.returncode != 0:
        print(f"[!] Error running command: {command}")
        return False
    return True

def main():
    print("=" * 60)
    print("             KARIRENERGI SYNC & DEPLOYMENT PIPELINE")
    print("=" * 60)

    # 1. Run database audit
    print("\n[Step 1/3] Consolidating and auditing database JSON files...")
    if not run_command("python3 audit_json.py"):
        print("[!] Sync aborted: Audit step failed.")
        sys.exit(1)

    # 2. Build production assets
    print("\n[Step 2/3] Building production assets for Vite React app...")
    web_app_dir = os.path.join(os.getcwd(), "web-app")
    if not run_command("npm run build", cwd=web_app_dir):
        print("[!] Sync aborted: React build step failed.")
        sys.exit(1)

    # 3. Optional Git Push
    print("\n[Step 3/3] Git push sync...")
    choice = input("Apakah Anda ingin melakukan Git Commit & Push secara otomatis? (y/N): ").strip().lower()
    if choice == 'y':
        commit_msg = "data: sync database and rebuild production assets"
        print(f"[*] Adding files to Git...")
        if run_command("git add ."):
            print(f"[*] Committing with message: '{commit_msg}'...")
            run_command(f'git commit -m "{commit_msg}"')
            print(f"[*] Pushing to remote repository...")
            run_command("git push")
    else:
        print("[*] Melewati langkah Git Push.")

    print("\n" + "=" * 60)
    print("[+] PIPELINE BERHASIL DISELESAIKAN!")
    print("    Silakan jalankan './deploy.sh' di terminal SSH Anda untuk menayangkan.")
    print("=" * 60)

if __name__ == "__main__":
    main()
