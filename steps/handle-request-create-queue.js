var create_rabbitmq_queue = require('jackrabbit/lib/queue'),
    create_task = require('cjs-task');

module.exports = function( task, config ){
  if( ! config ) config = {};

  task.step( 'handle create-queue requests', function(){
    var citizen = task.get( 'citizen' );

    citizen.request.handle( 'create-queue', function( envelope, end_request ){
      var request = envelope.msg,
          success = false,
          error;

      try {
        handle_create_queue_request( request, end_request );
        success = true;
      }

      catch( create_error ){
        error = create_error;
      }

      if( ! success ) return end_request( error );
    });

    task.next();

    function handle_create_queue_request( request, end_request ){
      var handle_request = create_task();

      handle_request.callback( function( error ){
        if( error ) return end_request( error );

        var created_queue = handle_request.get( 'queue' ),
            created_queue_name = created_queue.name;

        end_request( null, { name: created_queue_name });
      });

      handle_request.set( 'rabbitmq', task.get( 'rabbitmq' ) );
      handle_request.set( 'queue-id', request.data.queue_id );
      handle_request.set( 'config', request.data.config );

      handle_request.step( 'ensure queue id is unique', function(){
        var queues = task.get( 'queues' ),
            queue_id = handle_request.get( 'queue-id' );

        if( ! queues ){
          queues = {};
          task.set( 'queues', queues );
        }

        if( queues.hasOwnProperty( queue_id ) ) throw new Error( 'queue "' + queue_id + '" already exists' );

        handle_request.next();
      });

      handle_request.step( 'get rabbitmq connection', function(){
        var rabbitmq = handle_request.get( 'rabbitmq' ),
            rabbitmq_internals = rabbitmq.getInternals(),
            connection = rabbitmq_internals.connection;

        handle_request.set( 'rabbitmq-connection', connection );
        handle_request.next();
      });

      handle_request.step( 'configure queue', function(){
        var connection = handle_request.get( 'rabbitmq-connection' ),
            queue_config = handle_request.get( 'config' ),
            queue_id = handle_request.get( 'queue-id' ),
            queues = task.get( 'queues' ),
            queue = create_rabbitmq_queue( queue_config );

        // end task if queue or connection has an error
          queue.on( 'error', end_request_handler_on_error );
          connection.on( 'error', end_request_handler_on_error );

        // delete closing queue map of queues
          queue.on( 'close', ()=> queues[ queue_id ] = null );

        // notify on lifecycle events
          queue.on( 'ready', ()=> citizen.noticeboard.notify( citizen.get_name() + '-queue-created', { queue_id: queue_id }) );
          queue.on( 'close', function( error ){
            var payload = { queue_id: queue_id };
            if( error ) payload.error = error.message;

            citizen.noticeboard.notify( citizen.get_name() + '-queue-closed', payload );
          });

        // log lifecycle events
          queue.on( 'ready', ()=> console.log( 'action=queue-created id=' + queue_id ) );
          queue.on( 'close', function( error ){
            var log_entry = 'action=queue-closed id=' + queue_id;
            if( error ) log_entry += ' error="'+ error.message + '"';

            console.log( log_entry );
          });

        handle_request.set( 'queue', queue );
        handle_request.next();

        function end_request_handler_on_error( error ){
          if( handle_request && handle_request.end ) return handle_request.end( error );
        }
      });

      handle_request.step( 'assert queue', function(){
        var connection = handle_request.get( 'connection' ),
            queue = handle_request.get( 'queue' );

        queue.on( 'ready', function(){
          handle_request.next();
        });

        queue.connect( connection );
      });

      handle_request.start();
    }
  });
}