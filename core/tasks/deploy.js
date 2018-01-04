"use strict";
let Yaml = require('yml');
let gulp = require('gulp');
let gssh = require('gulp-ssh');
let util = require('gulp-util');

module.exports = () => {
  const argv = require('yargs').argv;
  if (argv.stage === null || argv.stage === undefined) return console.warn("stage should be set to 'test', 'staging' or 'production'");
  const stage = argv.stage;
  const config = Yaml.load(__dirname + "/deploy.yml", stage);
  const version = new Date().getTime()
  config.ssh.privateKey = require('fs').readFileSync(config.ssh.privateKey);
  const ssh = gssh({ignoreErrors: false, sshConfig: config.ssh});
  util.log(util.colors.green("shell logs can be found at"), util.colors.bgGreen("logs/gulp.ssh.log"));
  const current = `${config.path}/current`;
  const release = `${config.path}/releases/${version}`;
  const clone = [
    `mkdir -p ${release}`,
    `cd ${release}`,
    `git clone -b ${config.git.branch} ${config.git.remote} ./`,
    `cd core`,
    `npm run install-modules`,
    `ln -s ${config.path}/config/config.yml ${release}/core/config/config.yml`,
  ]
  const run = [
    `cd ${current} && ${config.stop}`,
    `rm -rf ${current}`,
    `ln -s ${release} ${current}`,
    `cd ${current}`,
    `${config.start} ${stage}`
  ];
  const clean = [
    `cd ${config.path}/releases/`,
    `ls -d */ | sort -r | tail -n +${config.history + 1} | xargs rm -rf`
  ];
  let cmds = [];
  cmds = cmds.concat(clone, run, clean);
  ssh
    .shell(cmds)
    .on('ssh2Data', function (chunk) {
      process.stdout.write(chunk);
    });
}
