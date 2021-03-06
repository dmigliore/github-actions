const core = require('@actions/core');
const exec = require('@actions/exec');
const io = require('@actions/io');
const tc = require('@actions/tool-cache');
const util = require('util');

async function run()
{
  try
  {
    if(process.platform === 'win32')
    {
      const prefix = core.getInput('install-prefix');
      const archive = await tc.downloadTool("http://bitbucket.org/eigen/eigen/get/3.3.7.zip")
      const folder = await tc.extractZip(archive, '.');
      process.chdir('eigen-eigen-323c052e1731');
      await io.mkdirP('build');
      process.chdir('build');
      await exec.exec(util.format('cmake ../ -DCMAKE_INSTALL_PREFIX="%s"', prefix));
      await exec.exec('cmake --build . --target install --config RelWithDebInfo');
    }
    else if(process.platform === 'darwin')
    {
      await exec.exec('brew install eigen');
    }
    else
    {
      await exec.exec('sudo apt-get update -qq');
      await exec.exec('sudo apt-get install -qq libeigen3-dev');
    }
  }
  catch(error)
  {
    core.setFailed(error.message);
  }
}

run();
