FROM elasticsearch:1.7.6

RUN /usr/share/elasticsearch/bin/plugin install lmenezes/elasticsearch-kopf/v1.6.1

RUN /usr/share/elasticsearch/bin/plugin -i transport-couchbase -url https://github.com/couchbaselabs/elasticsearch-transport-couchbase/releases/download/2.1.2-GA/elasticsearch-transport-couchbase-2.1.2.zip

