import os
import sys
import zipfile

def create_dist_zip(output_path):
    dist_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'dist')
    if not os.path.exists(dist_dir):
        print("DIST_NOT_FOUND")
        return

    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(dist_dir):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, dist_dir)
                zipf.write(full_path, rel_path)
    print("SUCCESS")

if __name__ == '__main__':
    out_file = sys.argv[1] if len(sys.argv) > 1 else '/tmp/github_pages.zip'
    create_dist_zip(out_file)
