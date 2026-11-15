import hashlib
import sqlite3

key = 'fsk_demouser'
h = hashlib.sha256(key.encode()).hexdigest()
conn = sqlite3.connect('backend/fieldshift.db')
conn.execute("UPDATE anonymous_clients SET access_key_hash=? WHERE client_id='client_811b1b8240bf4eb48c54dcdacf4d1d8a'", (h,))
conn.commit()
print("Updated! Key is:", key)
