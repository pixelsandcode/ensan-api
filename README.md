# ensan API

## Setting up for first time
Make sure you have git, nvm, node, docker, docker-compose, waker-cli installed

## Get the project and install npms
- Clone the project `git clone https://github.com/pixelsandcode/ensan-api`
- In the `core/` folder do `npm run install-modules`
- In the `core/` folder do `npm run install-configs`

## Database
- Go to `setup/elasticsearch` and run following command to create elasticsearch image including required plugins:
    - `docker build -t es-kopf-transport:1.7.6 .`
- Go to `setup` and run:
    - `docker-compose up`
- Wait for docker-compose to download and run services. When service are up and running, open browser and go to `localhost:8091` then configure couchbase for first time. Do not create `default` bucket and set `Administrator` user's password to `22751838`.
- Run following command to create required buckets and indexes and XDCR replication:
    - `bash configure.bash`
- If there was any issue on buckets, indexes, templates or XDCR, try to create everything manually.

## Run the application
- Run following command:
	- `waker run`
- To run server in environments other than development environment, pass `-e <environment>` flag to run command. For example to run servers in `functionaltest` environment:
	- `waker run -e functionaltest`
