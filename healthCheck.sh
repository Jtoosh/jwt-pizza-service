curl https://pizza-service.jtdevops.click/ | jq

curl -X PUT https://pizza-service.jtdevops.click/api/auth -d '{"email":"a@jwt.com", "password":"admin"}' -H 'Content-Type: application/json' | jq