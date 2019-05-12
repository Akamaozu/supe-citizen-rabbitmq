var uuid = require('uuid/v4');

module.exports = function( task, config ){
  if( ! config ) config = {};

  task.step( 'handle consume-queue requests', function(){
    var citizen = task.get( 'citizen' );

    citizen.request.handle( 'consume-queue', function( envelope, end_request ){
      var request = envelope.msg,
          queue_id = request.data.queue_id,
          options = request.data.options,
          success = false,
          error;

      try {
        consume_queue( queue_id, options );
        success = true;
      }

      catch( consume_error ){
        error = consume_error;
      }

      if( ! success ) end_request( error );
      else end_request( null, success );
    });

    task.next();

    function consume_queue( queue_id, options ){
      if( ! options ) options = {};

      var queues = task.get( 'queues' );
      if( ! queues.hasOwnProperty( queue_id ) ) throw new Error( 'no queue with id "'+ queue_id + '"' );

      var queue = queues[ queue_id ];

      queue.consume( handle_incoming_queue_item, options );

      function handle_incoming_queue_item( item, ack, nack ){
        var items = task.get( 'items' );

        if( ! items ){
          items = {};
          task.set( 'items', items );
        }

        var item_id = generate_unique_item_id();

        items[ item_id ] = {
          queue_id: queue_id,
          item: item,
          nack: nack,
          ack: ack
        };

        citizen.noticeboard.publish( citizen.get_name() +'-queue-'+ queue_id +'-new-item', {
          item: item,
          item_id: item_id,
          queue_id: queue_id
        });
      }

      function generate_unique_item_id(){
        var items = task.get( 'items' ),
            candidate_id = uuid();

        while( items.hasOwnProperty( candidate_id ) ){
          candidate_id = uuid();
        }

        return candidate_id;
      }
    }
  });
}