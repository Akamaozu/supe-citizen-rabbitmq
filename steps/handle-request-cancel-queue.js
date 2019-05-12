module.exports = function( task, config ){
  if( ! config ) config = {};

  task.step( 'handle cancel-queue requests', function(){
    var citizen = task.get( 'citizen' );

    citizen.request.handle( 'cancel-queue', function( envelope, end_request ){
      var request = envelope.msg,
          queue_id = request.data.queue_id,
          success = false,
          error;

      try {
        cancel_queue( queue_id );
        success = true;
      }

      catch( cancel_error ){
        error = cancel_error;
      }

      if( ! success ) end_request( error );
      else end_request( null, success );
    });

    task.next();

    function cancel_queue( queue_id ){
      if( ! queue_id ) throw new Error( 'queue id not specified' );

      var queues = task.get( 'queues' );
      if( ! queues.hasOwnProperty( queue_id ) ) throw new Error( 'no queue with id "'+ queue_id + '" found' );

      var queue = queues[ queue_id ];

      queue.cancel();
      delete queues[ queue_id ];
    }
  });
}