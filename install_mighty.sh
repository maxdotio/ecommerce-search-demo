#!/bin/bash

USER_NAME=$(whoami)

#Setup Encoder systemd unit files
MODEL_NAME=$(echo "max.io/ecommerce-encoder-v01" | sed 's/[\/&]/\\&/g')
TASK_NAME=$(echo "sentence-transformers" | sed 's/[\/&]/\\&/g')
cp mighty-unit-template temp-unit
sed -i -e "s/MODEL_NAME/$MODEL_NAME/g" temp-unit
sed -i -e "s/TASK_NAME/$TASK_NAME/g" temp-unit
mv temp-unit mighty-unit-encoder
cp mighty\@.service temp-service
sed -i -e "s/\\/home\\/ubuntu\\//\\/$USER_NAME\\//g" temp-service
sed -i -e "s/mighty-unit/mighty-unit-encoder/g" temp-service
sudo mv temp-service /etc/systemd/system/mighty-encoder\@.service

#Setup Cross-Encoder systemd unit files
MODEL_NAME=$(echo "max.io/ecommerce-crossencoder-v01" | sed 's/[\/&]/\\&/g')
TASK_NAME=$(echo "sequence-classification" | sed 's/[\/&]/\\&/g')
cp mighty-unit-template temp-unit
sed -i -e "s/MODEL_NAME/$MODEL_NAME/g" temp-unit
sed -i -e "s/TASK_NAME/$TASK_NAME/g" temp-unit
mv temp-unit mighty-unit-crossencoder
cp mighty\@.service temp-service
sed -i -e "s/\\/home\\/ubuntu\\//\\/$USER_NAME\\//g" temp-service
sed -i -e "s/mighty-unit/mighty-unit-crossencoder/g" temp-service
sudo mv temp-service /etc/systemd/system/mighty-crossencoder\@.service

sudo systemctl daemon-reload

for core in 0 1 2
do
        sudo systemctl enable mighty-encoder@$core.service
        sleep 0.2
        sudo systemctl start mighty-encoder@$core.service
        sleep 0.2
        sudo journalctl -u mighty-encoder@$core.service | cat | tail -n 5
done

for core in 3 4 5
do
        sudo systemctl enable mighty-crossencoder@$core.service
        sleep 0.2
        sudo systemctl start mighty-crossencoder@$core.service
        sleep 0.2
        sudo journalctl -u mighty-crossencoder@$core.service | cat | tail -n 5
done