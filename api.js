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

  return api;

  function create_exchange( exchange_id, config, callback ){
    var request_args = {
      exchange_id: exchange_id,
      config: config
    };

    citizen.request.send( rabbitmq_citizen_name, 'create-exchange', request_args, callback );
  }

  function create_queue( queue_id, config, callback ){
    var request_args = {};

    request_args.queue_id = queue_id;
    request_args.config = config;

    citizen.request.send( rabbitmq_citizen_name, 'create-queue', request_args, callback );
  }

  function consume_queue( queue_id, options, callback ){
    var request_args = {};

    request_args.queue_id = queue_id;
    request_args.options = options;

    citizen.request.send( rabbitmq_citizen_name, 'consume-queue', request_args, callback );
  }

  function bind_queue( queue_id, exchange_id, bind_key, options, callback ){
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

  function ack_item( item_id, callback ){
    citizen.request.send( rabbitmq_citizen_name, 'ack-item', { item_id: item_id }, callback );
  }

  function nack_item( item_id, callback ){
    citizen.request.send( rabbitmq_citizen_name, 'nack-item', { item_id: item_id }, callback );
  }

  function publish_to_exchange( exchange_id, item, config, callback ){
    var request_args = {};

    request_args.exchange_id = exchange_id;
    request_args.item = item;
    request_args.options = config;

    citizen.request.send( rabbitmq_citizen_name, 'publish-to-exchange', request_args, callback );
  }
}