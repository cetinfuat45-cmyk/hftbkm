import os
import sys
import zipfile

def create_project_zip(output_path):
    src_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ignore_dirs = {'node_modules', '.git', '.cache', '.npm'}
    ignore_extensions = {'.log', '.tmp'}

    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(src_dir):
            dirs[:] = [d for d in dirs if d not in ignore_dirs and (not d.startswith('.') or d == '.github')]
            for file in files:
                ext = os.path.splitext(file)[1]
                if ext in ignore_extensions or file == '.env':
                    continue
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, src_dir)
                zipf.write(full_path, rel_path)
    print("SUCCESS")

if __name__ == '__main__':
    out_file = sys.argv[1] if len(sys.argv) > 1 else '/tmp/project.zip'
    create_project_zip(out_file)
