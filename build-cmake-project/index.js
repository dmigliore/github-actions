const core = require('@actions/core');
const exec = require('@actions/exec');
const io = require('@actions/io');

async function run()
{
  try
  {
    // Take care of the build options
    const btype = core.getInput('build-type');
    let options = core.getInput('options');
    let sudo = true;
    // For projects that use cmake_add_fortran_subdirectory we need to hide sh from the PATH
    const OLD_PATH = process.env.PATH;
    if(process.platform === 'win32')
    {
      PATH = OLD_PATH;
      while(PATH.indexOf('Git') != -1)
      {
        PATH = PATH.replace('Git', 'dummy');
      }
      // Undo this otherwise gfortran libs are hidden
      PATH.replace('C:\Program Files\dummy\mingw64\bin', 'C:\Program Files\Git\mingw64\bin');
      const BOOST_LIB = process.env.BOOST_ROOT + '\\lib';
      if(PATH.indexOf(BOOST_LIB) == -1)
      {
        PATH = BOOST_LIB + ';' + PATH;
      }
      if(PATH.indexOf('C:\\devel\\install\\bin') == -1)
      {
        PATH = 'C:\\devel\\install\\bin;' + PATH;
      }
      core.exportVariable('PATH', PATH);
      core.startGroup("Modified PATH variable");
      console.log(PATH);
      core.endGroup();
      options = '-DCMAKE_INSTALL_PREFIX=C:/devel/install ' + options;
      if(btype.toLowerCase() == 'debug')
      {
        options = options + ' -DPYTHON_BINDING:BOOL=OFF';
      }
      options = options + ' ' + core.getInput('windows-options');
      sudo = false;
    }
    else if(process.platform === 'darwin')
    {
      options = '-DPYTHON_BINDING_BUILD_PYTHON2_AND_PYTHON3:BOOL=ON ' + options;
      options = options + ' ' + core.getInput('macos-options');
    }
    else
    {
      LD_LIBRARY_PATH = process.env.LD_LIBRARY_PATH ? process.env.LD_LIBRARY_PATH : '';
      if(LD_LIBRARY_PATH.indexOf('/usr/local/lib') == -1)
      {
        LD_LIBRARY_PATH = '/usr/local/lib:' + LD_LIBRARY_PATH;
        core.exportVariable('LD_LIBRARY_PATH', LD_LIBRARY_PATH);
      }
      options = '-DPYTHON_BINDING_BUILD_PYTHON2_AND_PYTHON3:BOOL=ON ' + options;
      options = options + ' ' + core.getInput('linux-options');
      const compiler = core.getInput('compiler');
      if(compiler == 'clang')
      {
        core.exportVariable('CC', 'clang');
        core.exportVariable('CXX', 'clang++');
        core.exportVariable('CCC_CXX', 'clang++');
      }
      else if(compiler != 'gcc')
      {
        core.warning('Compiler is set to ' + compiler + ' which is not recognized by this action');
      }
    }
    options = options + ' -DCMAKE_BUILD_TYPE=' + btype;

    // Take care of the actual build
    core.exportVariable('CMAKE_BUILD_PARALLEL_LEVEL', 2);
    const cwd = process.cwd();
    await io.mkdirP('build');
    process.chdir('build');
    core.startGroup('Configure');
    await exec.exec('cmake ../ ' + options);
    core.endGroup();
    core.startGroup('Build');
    await exec.exec('cmake --build . --config ' + btype);
    core.endGroup();
    core.startGroup('Install');
    let install_cmd = 'cmake --build . --target install --config ' + btype;
    if(sudo)
    {
      install_cmd = 'sudo ' + install_cmd;
    }
    await exec.exec(install_cmd);
    core.endGroup();
    core.startGroup('Test')
    await exec.exec('ctest -V -C ' + btype);
    core.endGroup();
    core.exportVariable('PATH', OLD_PATH);
  }
  catch(error)
  {
    core.setFailed(error.message);
  }
}

run();
