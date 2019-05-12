module.exports = function( task, config ){
  if( ! config ) config = {};

  task.step( 'handle create-queue requests', function(){
    var citizen = task.get( 'citizen' );

    citizen.request.handle( 'create-queue', function( envelope, end_request ){
      var request = envelope.msg,
          queue_id = request.data.queue_id,
          exchange_id = request.data.exchange_id,
          options = request.data.options,
          success = false,
          error;

      try {
        create_queue( queue_id, exchange_id, options );
        success = true;
      }

      catch( create_error ){
        error = create_error;
      }

      if( ! success ) end_request( error );
      else end_request( null, success );
    });

    task.next();

    function create_queue( queue_id, exchange_id, options ){
      if( ! queue_id ) throw new Error ( 'queue id not specified' );
      if( ! exchange_id ) throw new Error ( 'exchange id not specified' );

      var exchanges = task.get( 'exchanges' ),
          queues = task.get( 'queues' );

      if( ! queues ){
        queues = {};
        task.set( 'queues', queues );
      }

      if( queues.hasOwnProperty( queue_id ) ) throw new Error( 'queue "' + queue_id + '" already exists' );
      if( ! exchanges.hasOwnProperty( exchange_id ) ) throw new Error( 'exchange "' + exchange_id + '" does not exist' );
      if( ! options ) options = {};

      // create queue
        var exchange = exchanges[ exchange_id ],
            created_queue = exchange.queue( options );

        queues[ queue_id ] = created_queue;

      // cleanup on close
        created_queue.on( 'close', ()=> queues[ queue_id ] = null );

      // pipe lifecycle events to noticeboard
        created_queue.on( 'ready', ()=> citizen.noticeboard.notify( citizen.get_name() + '-queue-created', { queue_id: queue_id }) );
        created_queue.on( 'close', function( error ){
          var payload = { queue_id: queue_id };
          if( error ) payload.error = error.message;

          citizen.noticeboard.notify( citizen.get_name() + '-queue-closed', payload );
        });

      // log lifecycle events
        created_queue.on( 'ready', ()=> console.log( 'action=queue-created id=' + queue_id ) );
        created_queue.on( 'close', function( error ){
          var log_entry = 'action=queue-closed id=' + queue_id;
          if( error ) log_entry += ' error="'+ error.message + '"';

          console.log( log_entry );
        });

    }
  });
}