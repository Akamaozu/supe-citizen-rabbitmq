module.exports = function( task, config ){
  if( ! config ) config = {};

  task.step( 'handle ack-item requests', function(){
    var citizen = task.get( 'citizen' );

    citizen.request.handle( 'ack-item', function( envelope, end_request ){
      var request = envelope.msg,
          item_id = request.data.item_id,
          options = request.data.options,
          success = false,
          error;

      try{
        ack_item( item_id, options );
        success = true;
      }

      catch( ack_error ){
        error = ack_error;
      }

      if( error ) end_request( error );
      else end_request( null, success );
    });

    function ack_item( item_id, options ){
      if( ! options ) options = {};

      var items = task.get( 'items' ),
          item = items[ item_id ];

      if( ! item ) throw new Error( 'no item with id "'+ item_id + '" found' );

      item.ack( options );

      delete items[ item_id ];
    }

    task.next();
  });
}