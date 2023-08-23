const cluster = require('cluster');

const runPrimaryProcess = () => {
  const processesCount = 4;
  console.log(`Primary ${process.pid} is running`);
  console.log(`Forking Server with ${processesCount} processes \n`);

  for (let index = 0; index < processesCount; index++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    if (code !== 0 && !worker.exitedAfterDisconnect) {
      console.log(`Worker ${worker.process.pid} died... scheduling another one! ${signal} e ${code}`);

      cluster.fork();
    }
  });
};

const runWorkerProcess = async () => {
  await import('./index.js');
};

cluster.isPrimary ? runPrimaryProcess() : runWorkerProcess();
