import re, os, tempfile
s = open(os.path.join(tempfile.gettempdir(), "main.js"), encoding="utf-8", errors="replace").read()
print("len:", len(s))
urls = sorted(set(re.findall(r'"([^"]*(?:config|json|gaez|catalog)[^"]*)"', s, re.I)))
for u in urls[:30]:
    print(u[:160])
