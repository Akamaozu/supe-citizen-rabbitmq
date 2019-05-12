module.exports = function( task, config ){
  if( ! config ) config = {};

  task.step( 'log rabbitmq connection lifecycle events', function(){
    var rabbitmq = task.get( 'rabbitmq' );

    rabbitmq.on( 'connected', function(){
      console.log( 'action=connect-to-rabbitmq-server' );
    });

    rabbitmq.on( 'close', function(){
      console.log( 'action=disconnect-from-rabbitmq-server' );
    });

    rabbitmq.on( 'error', function( error ){
      console.log( 'action=rabbitmq-connection-error error="' + error.message + '"' );
    });

    task.next();
  });
}