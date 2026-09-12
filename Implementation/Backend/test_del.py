import urllib.request
import json

req = urllib.request.Request(
    'http://localhost:8000/api/tickets',
    data=json.dumps({
        'customer_name': 'Del User',
        'customer_email': 'del@test.com',
        'subject': 'Test Del',
        'description': 'Testing delete functionality'
    }).encode(),
    headers={'Content-Type': 'application/json', 'Authorization': 'Bearer dev-test-token'}
)
res = urllib.request.urlopen(req)
t = json.loads(res.read())
print('Created ticket:', t['ticket_id'])

del_req = urllib.request.Request(
    f"http://localhost:8000/api/tickets/{t['ticket_id']}",
    headers={'Authorization': 'Bearer dev-test-token'},
    method='DELETE'
)
del_res = urllib.request.urlopen(del_req)
print('Delete response:', del_res.read().decode())
