#!/usr/bin/env bash
# Read the bucket names from env variable BUCKETS
buckets=(ensan)
username=Administrator
password=22751838
CURRENT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Make sure json parser is installed
PKG_OK=$(dpkg-query -W --showformat='${Status}\n' jq|grep "install ok installed")
if [ "" == "$PKG_OK" ]; then
  sudo apt-get --yes install jq
fi

# Get es cluster UUID
response=$(
    curl -u $username:$password \
        localhost:8091/pools/default/remoteClusters
)
length=$(
    echo $response | jq ". | length"
)
uuid=''
numberRegex='^[0-9]+$'
if [[ $length =~ $numberRegex ]]; then
    for ((i=1;i<=$length;i+=1))
    do
        index=$i-1
        cluserName=$(echo $response | jq -r ".[$index].name")
        if [ $cluserName == "es" ]; then
            uuid=$(echo $response | jq -r ".[$index].uuid")
        fi
    done
fi

for bucket in "${buckets[@]}"
do
    # Create couchbase bucket if it doesn't exist
    response=$(
        curl http://localhost:8091/pools/default/buckets/$bucket --write-out %{http_code}
    )
    if [ $response != 200 ]; then
        curl -X POST -u $username:$password \
            -d name=$bucket -d ramQuotaMB=256 -d authType=sasl -d replicaNumber=1 \
            http://localhost:8091/pools/default/buckets
    fi

    # Delete Couchbase XDCR
    if [ "$uuid" != "" ]; then
        curl -u $username:$password \
         -XDELETE http://localhost:8091/controller/cancelXDCR/$uuid%2F$bucket%2F$bucket
    fi

    # Recreate Elasticsearch index
    curl -XDELETE curl -XDELETE http://localhost:9200/$bucket
    curl -XPUT http://localhost:9200/_template/$bucket?pretty=true -d @$CURRENT_DIR/elasticsearch/$bucket.template.json
    curl -XPOST http://localhost:9200/$bucket
done

# Create remote cluster
curl -u $username:$password -XDELETE http://localhost:8091/pools/default/remoteClusters/es
curl -u $username:$password \
http://localhost:8091/pools/default/remoteClusters \
-d name=es \
-d hostname=es:9091 \
-d username=$username \
-d password=$password

## Create XDCR
for bucket in "${buckets[@]}"
do
    curl -v -X POST -u $username:$password http://localhost:8091/controller/createReplication \
    -d fromBucket=$bucket \
    -d toCluster=es \
    -d toBucket=$bucket \
    -d replicationType=continuous \
    -d type=capi
done

