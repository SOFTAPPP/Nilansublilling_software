const bcryptjs = require('bcryptjs');

async function test() {
  const hash = '$2b$10$DYdH8xU2VII8VYmEmugJ2.R5qTDJL2uwQpphAamOj/uxSFbR7uFwe';
  const match = await bcryptjs.compare('Aritradutta@005', hash);
  console.log('Match:', match);
}

test();
