module.exports = function( task, config ){
  if( ! config ) config = {};

  task.step( 'handle create-exchange requests', function(){
    var citizen = task.get( 'citizen' );

    citizen.request.handle( 'create-exchange', function( envelope, end_request ){
      var request = envelope.msg,
          exchange_id = request.data.exchange_id,
          options = request.data.options,
          success = false,
          error;

      try {
        create_exchange( exchange_id, options );
        success = true;
      }

      catch( create_exchange_error ){
        error = create_exchange_error;
      }

      if( ! success ) end_request( error );
      else end_request( null, success );
    });

    task.next();

    function create_exchange( exchange_id, options ){
      if( ! exchange_id ) throw new Error ( 'exchange id not specified' );
      if( ! options ) options = {};

      var exchanges = task.get( 'exchanges' );

      if( ! exchanges ){
        exchanges = {};
        task.set( 'exchanges', exchanges );
      }

      if( exchanges.hasOwnProperty( exchange_id ) ) throw new Error( 'exchange "' + exchange_id + '" already exists' );

      var exchange_config = {
            type: options.type ? options.type : 'default',
            name: options.name ? options.name : '',
            durable: options.durable ? options.durable : true,
            noReply: options.noReply ? options.noReply : false,
            internal: options.internal ? options.internal : false,
            autoDelete: options.autoDelete ? options.autoDelete : false,
            alternateExchange: options.alternateExchange ? options.alternateExchange : undefined
          };

      var rabbitmq = task.get( 'rabbitmq' );
      if( ! rabbitmq.hasOwnProperty( exchange_config.type ) ) throw new Error( 'unknown exchange type: "' + exchange_config.type + '"' );

      // create exchange
        var created_exchange = rabbitmq[ exchange_config.type ]( exchange_config.name, exchange_config );
        exchanges[ exchange_id ] = created_exchange;

      // cleanup on close
        created_exchange.on( 'close', ()=> exchanges[ exchange_id ] = null );

      // pipe lifecycle events to noticeboard
        created_exchange.on( 'ready', ()=> citizen.noticeboard.notify( citizen.get_name() + '-exchange-created', { exchange_id: exchange_id }) );
        created_exchange.on( 'close', function( error ){
          var payload = { exchange_id: exchange_id };
          if( error ) payload.error = error.message;

          citizen.noticeboard.notify( citizen.get_name() + '-exchange-closed', payload );
        });

      // log lifecycle events
        created_exchange.on( 'ready', ()=> console.log( 'action=exchange-created id=' + exchange_id ) );
        created_exchange.on( 'close', function( error ){
          var log_msg = 'action=exchange-closed id=' + exchange_id;
          if( error ) log_msg += ' error="' + error.message + '"';

          console.log( log_msg );
        });
    }
  });
}