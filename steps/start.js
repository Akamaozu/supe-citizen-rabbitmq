var path = require('path'),
    path_to_rabbitmq_citizen = path.join( __dirname, '/../citizen' ),
    path_to_rabbitmq_citizen_api = path.join( __dirname, '/../api' );

module.exports = function( task, config ){
  if( ! config ) config = {};

  var rabbitmq_citizen_name = 'rabbitmq_citizen_name' in config ? config.rabbitmq_citizen_name : 'rabbitmq';

  task.step( 'start rabbitmq citizen', function(){
    var citizen = task.get( 'citizen' );

    citizen.supervisor.start( rabbitmq_citizen_name, path_to_rabbitmq_citizen, function( error ){
      if( error ) return task.end( error );
      else task.next();
    });
  });

  task.step( 'configure rabbitmq api', function(){
    var citizen = task.get( 'citizen' ),
        rabbitmq_api = require( path_to_rabbitmq_citizen_api ),
        rabbitmq_api_instance = rabbitmq_api( citizen, rabbitmq_citizen_name );

    task.set( 'rabbitmq', rabbitmq_api_instance );
    task.next();
  });
}