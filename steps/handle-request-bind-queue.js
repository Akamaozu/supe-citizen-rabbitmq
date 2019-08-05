var create_task = require('cjs-task');

module.exports = function( task, config ){
  if( ! config ) config = {};

  task.step( 'handle bind-queue requests', function(){
    var citizen = task.get( 'citizen' );

    citizen.request.handle( 'bind-queue', function( envelope, end_request ){
      var request = envelope.msg,
          success = false,
          error;

      try{
        handle_bind_queue_request( request, end_request );
        success = true;
      }

      catch( handle_error ){
        error = handle_error;
      }

      if( ! success ) end_request( error );
    });

    task.next();

    function handle_bind_queue_request( request, end_request ){
      var exchange_id = request.data.exchange_id,
          queue_id = request.data.queue_id,
          bind_key = request.data.bind_key,
          options = request.data.options;

      if( ! exchange_id ) return end_request( new Error( 'exchange id not specified' ) );
      if( ! queue_id ) return end_request( new Error( 'queue id not specified' ) );
      if( ! bind_key ) return end_request( new Error( 'bind key not specified' ) );
      if( ! options ) options = {};

      var bind_queue = create_task();

      bind_queue.callback( function( error ){
        if( error ) return end_request( error );
        else end_request( null, true );
      });

      bind_queue.set( 'queue-id', queue_id );
      bind_queue.set( 'exchange-id', exchange_id );
      bind_queue.set( 'bind-key', bind_key );
      bind_queue.set( 'bind-options', options );
      bind_queue.set( 'rabbitmq-connection', task.get( 'rabbitmq-connection' ) );

      bind_queue.step( 'create connection channel', function(){
        var connection = bind_queue.get( 'rabbitmq-connection' );

        connection.createChannel( function( error, channel ){
          if( error ) return bind_queue.end( error );

          bind_queue.set( 'rabbitmq-channel', channel );
          bind_queue.next();
        });
      });

      bind_queue.step( 'get queue and exchange to bind', function(){
        var exchanges = task.get( 'exchanges' ),
            queues = task.get( 'queues' );

        if( ! exchanges[ exchange_id ] ) throw new Error( 'exchange not found' );
        if( ! queues[ queue_id ] ) throw new Error( 'queue not found' );

        var exchange = exchanges[ exchange_id ],
            queue = queues[ queue_id ];

        bind_queue.set( 'exchange', exchange );
        bind_queue.set( 'queue', queue );

        bind_queue.next();
      });

      bind_queue.step( 'bind queue to exchange', function(){
        var channel = bind_queue.get( 'rabbitmq-channel' ),
            exchange = bind_queue.get( 'exchange' ),
            queue = bind_queue.get( 'queue' ),
            bind_key = bind_queue.get( 'bind-key' ),
            options = bind_queue.get( 'bind-options' );

        channel.bindQueue( queue.name, exchange.name, bind_key, options, function( error ){
          if( error ) return bind_queue.end( error );
          else bind_queue.next();
        });
      });

      bind_queue.start();
    }
  });
}