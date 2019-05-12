module.exports = function( task, config ){
  if( ! config ) config = {};

  task.step( 'handle publish-to-exchange requests', function(){
    var citizen = task.get( 'citizen' );

    citizen.request.handle( 'publish-to-exchange', function( envelope, end_request ){
      var request = envelope.msg,
          exchange_id = request.data.exchange_id,
          item_to_publish = request.data.item,
          options = request.data.options,
          success = false,
          error;

      try {
        publish_to_exchange( exchange_id, item_to_publish, options );
        success = true;
      }

      catch( publish_error ){
        error = publish_error;
      }

      if( ! success ) end_request( error );
      else end_request( null, success );
    });

    task.next();

    function publish_to_exchange( exchange_id, item, options ){
      var exchanges = task.get( 'exchanges' );

      if( ! options ) options = {};
      if( ! item ) throw new Error ( 'no item to publish specified' );
      if( ! exchange_id ) throw new Error ( 'id of exchange to publish to not specified' );
      if( ! exchanges || ! exchanges.hasOwnProperty( exchange_id ) ) throw new Error( 'exchange with id "' + exchange_id + '" not found' );

      exchanges[ exchange_id ].publish( item, options );
    }
  });
}