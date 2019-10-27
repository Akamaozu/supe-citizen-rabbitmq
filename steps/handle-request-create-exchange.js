module.exports = function( task, config ){
  if( ! config ) config = {};

  task.step( 'handle create-exchange requests', function(){
    var citizen = task.get( 'citizen' );

    citizen.request.handle( 'create-exchange', function( envelope, end_request ){
      var request = envelope.msg,
          success = false,
          error;

      try {
        create_exchange( request, end_request );
        success = true;
      }

      catch( create_exchange_error ){
        error = create_exchange_error;
      }

      if( ! success ) end_request( error );
    });

    task.next();

    function create_exchange( request, end_request ){
      var exchange_id = request.data.exchange_id,
          config = request.data.config;

      if( ! exchange_id ) return end_request( new Error ( 'exchange id not specified' ) );
      if( ! config ) config = {};

      var exchanges = task.get( 'exchanges' );

      if( ! exchanges ){
        exchanges = {};
        task.set( 'exchanges', exchanges );
      }

      if( exchanges.hasOwnProperty( exchange_id ) ) return end_request( new Error( 'exchange "' + exchange_id + '" already exists' ) );

      var exchange_config = {
            type: config.type ? config.type : 'default',
            name: config.name ? config.name : '',
            durable: config.durable ? config.durable : true,
            noReply: config.noReply ? config.noReply : false,
            internal: config.internal ? config.internal : false,
            autoDelete: config.autoDelete ? config.autoDelete : false,
            alternateExchange: config.alternateExchange ? config.alternateExchange : undefined
          };

      var rabbitmq = task.get( 'rabbitmq' );
      if( ! rabbitmq.hasOwnProperty( exchange_config.type ) ) return end_request( new Error( 'unknown exchange type: "' + exchange_config.type + '"' ) );

      // create exchange
        var created_exchange = rabbitmq.exchange()( exchange_config.type, exchange_config.name, exchange_config );
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

      created_exchange.on( 'ready', function(){
        end_request( null, { name: created_exchange.name });
      });
    }
  });
}