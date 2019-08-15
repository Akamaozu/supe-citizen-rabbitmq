var jackrabbit = require('@pager/jackrabbit');

module.exports = function( task, config ){
  if( ! config ) config = {};

  task.step( 'create rabbitmq server connection', function(){
    var rabbitmq_server_url = config.url || task.get( 'rabbitmq-url' ) || process.env.RABBITMQ_URL;
    if( ! rabbitmq_server_url ) throw new Error( 'no rabbitmq server url specified' );

    var rabbitmq = jackrabbit( rabbitmq_server_url );

    task.set( 'rabbitmq', rabbitmq );
    task.next();
  });
}