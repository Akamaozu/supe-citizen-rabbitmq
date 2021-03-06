var citizen = require('supe'),
    create_task = require('cjs-task'),
    supe_addon_citizen_request = require('supe-addon-citizen-request'),

    app = create_task();

citizen.use( supe_addon_citizen_request );

app.set( 'citizen', citizen );

require( './steps/create-rabbitmq-connection' )( app );
require( './steps/log-connection-lifecycle-events' )( app );

app.step( 'crash when connection ends', function(){
  var rabbitmq = app.get( 'rabbitmq' );

  rabbitmq.on( 'error', function( error ){
    console.log( 'action=crash-on-error reason="'+ error.message +'"' );
    return app.end( error );
  });

  app.next();
});

require( './steps/handle-request-create-exchange' )( app );
require( './steps/handle-request-publish-to-exchange' )( app );
require( './steps/handle-request-create-queue' )( app );
require( './steps/handle-request-cancel-queue' )( app );
require( './steps/handle-request-consume-queue' )( app );
require( './steps/handle-request-bind-queue' )( app );
require( './steps/handle-request-ack-item' )( app );
require( './steps/handle-request-nack-item' )( app );

app.step( 'start processing requests', function(){
  var rabbitmq = app.get( 'rabbitmq' );

  rabbitmq.on( 'connected', citizen.mail.receive );
});

app.callback( function( error ){
  if( error ) console.log( error );
  process.exit( error ? 1 : 0 );
});

app.start();