host=https://pizza-service.jtdevops.click/

echo "Testing $host"

curl $host | jq

login=${host}api/auth

curl -X PUT $login -d '{"email":"a@jwt.com", "password":"admin"}' -H 'Content-Type: application/json' | jq

menu=${host}api/order/menu

curl $menu | jq

# version=${host}version.json

# curl -s $version | jq
