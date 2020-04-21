var create_task = require('cjs-task'),
    create_hook = require('cjs-sync-hooks');

module.exports = function( citizen, rabbitmq_citizen_name ) {
  if( ! citizen ) throw new Error( 'citizen required to create api instance' );
  if( ! rabbitmq_citizen_name ) rabbitmq_citizen_name = 'rabbitmq';

  var api = {};

  api.ack_item = ack_item;
  api.nack_item = nack_item;
  api.bind_queue = bind_queue;
  api.create_queue = create_queue;
  api.cancel_queue = cancel_queue;
  api.consume_queue = consume_queue;
  api.create_exchange = create_exchange;
  api.publish_to_exchange = publish_to_exchange;

  api.hook = create_hook();

  return api;

  function create_exchange( exchange_id, config, callback ){
    var args_given = arguments.length;
    if( args_given == 2 && typeof config == 'function' ){
      callback = config;
      config = {};
    }

    var request_args = {
      exchange_id: exchange_id,
      config: config
    };

    citizen.request.send( rabbitmq_citizen_name, 'create-exchange', request_args, callback );
  }

  function create_queue( queue_id, config, callback ){
    var args_given = arguments.length;
    if( args_given == 2 && typeof config == 'function' ){
      callback = config;
      config = {};
    }

    var queue_creation = create_task();

    queue_creation.callback( function( error ){
      if( error ) return callback( error );

      var created_queue = queue_creation.get( 'created-queue' );
      if( ! created_queue ) return callback( new Error( 'created queue details not found' ) );
      else return callback( null, created_queue );
    });

    queue_creation.step( 'send creation request to rabbitmq citizen', function(){
      var request_args = { queue_id: queue_id, config: config };

      citizen.request.send( rabbitmq_citizen_name, 'create-queue', request_args, function( error, created_queue ){
        if( error ) return queue_creation.end( error );

        queue_creation.set( 'created-queue', created_queue );
        queue_creation.next();
      });
    });

    queue_creation.step( 'define behavior when new item enters queue', function(){

      citizen.noticeboard.watch( rabbitmq_citizen_name +'-queue-'+ queue_id +'-new-item', 'handle-new-item', function( msg ){
        var details = msg.notice,
            item_id = details.item_id,
            item = details.item,
            mail = item,
            mail_handled = false;

        api.hook.run( rabbitmq_citizen_name +'-'+ queue_id +'-mail-received', handle_mail, mail );

        if( ! mail_handled ){
          console.log( 'action=handle-'+ rabbitmq_citizen_name +'-'+ queue_id +'-mail success=false reason="no handler for mail found" mail=', mail );
          return ack_mail( item_id );
        }

        function handle_mail(){
          if( mail_handled ) return;

          mail_handled = true;

          api.hook.end();

          return function(){
            ack_mail( item_id );
          }
        }

        function ack_mail( item_id, config ){

          api.ack_item( item_id, config, function( error ){
            if( error ) console.log( 'action=ack-'+ rabbitmq_citizen_name +'-'+ queue_id +'-item success=false reason="'+ error.message + '"' );
          });
        }
      });

      queue_creation.next();
    });

    queue_creation.start();
  }

  function consume_queue( queue_id, options, callback ){
    var args_given = arguments.length;
    if( args_given == 2 && typeof options == 'function' ){
      callback = options;
      options = {};
    }

    var request_args = {};

    request_args.queue_id = queue_id;
    request_args.options = options;

    citizen.request.send( rabbitmq_citizen_name, 'consume-queue', request_args, callback );
  }

  function bind_queue( queue_id, exchange_id, bind_key, options, callback ){
    var args_given = arguments.length;
    if( args_given == 4 && typeof options == 'function' ){
      callback = options;
      options = {};
    }

    var request_args = {};

    request_args.exchange_id = exchange_id;
    request_args.queue_id = queue_id;
    request_args.bind_key = bind_key;
    request_args.options = options;

    citizen.request.send( rabbitmq_citizen_name, 'bind-queue', request_args, callback );
  }

  function cancel_queue( queue_id, callback ){
    citizen.request.send( rabbitmq_citizen_name, 'cancel-queue', { queue_id: queue_id }, callback );
  }

  function ack_item( item_id, options, callback ){
    var args_given = arguments.length;
    if( args_given == 2 && typeof options == 'function' ){
      callback = options;
      options = {};
    }

    var request_args = {};

    request_args.item_id = item_id;
    request_args.options = options;

    citizen.request.send( rabbitmq_citizen_name, 'ack-item', request_args, callback );
  }

  function nack_item( item_id, options, callback ){
    var args_given = arguments.length;
    if( args_given == 2 && typeof options == 'function' ){
      callback = options;
      options = {};
    }

    var request_args = {};

    request_args.item_id = item_id;
    request_args.options = options;

    citizen.request.send( rabbitmq_citizen_name, 'nack-item', request_args, callback );
  }

  function publish_to_exchange( exchange_id, item, options, callback ){
    var args_given = arguments.length;
    if( args_given == 3 && typeof options == 'function' ){
      callback = options;
      options = {};
    }

    var request_args = {};

    request_args.exchange_id = exchange_id;
    request_args.item = item;
    request_args.options = options;

    citizen.request.send( rabbitmq_citizen_name, 'publish-to-exchange', request_args, callback );
  }
}