/**
 * AI Chatbot – WooCommerce Cart Bridge
 *
 * Runs on the WordPress parent page (same origin as WooCommerce).
 * Listens for postMessage requests from the chatbot iframe (agents.robofy.ai)
 * and proxies WooCommerce Store API cart calls back, forwarding the WC nonce
 * and session cookies that are inaccessible from the cross-origin iframe.
 *
 * Incoming message types (from iframe):
 *   { type: 'wc_bridge_ping' }
 *   { type: 'wc_cart_request', requestId: '<id>', action: 'get_cart' }
 *   { type: 'wc_cart_request', requestId: '<id>', action: 'add_item',    payload: { product_id, quantity, variation } }
 *   { type: 'wc_cart_request', requestId: '<id>', action: 'remove_item', payload: { cart_item_key } }
 *
 * Outgoing message types (to iframe):
 *   { type: 'wc_bridge_ready',   nonce: '<nonce>' }
 *   { type: 'wc_cart_response',  requestId: '<id>', success: true,  data: { ... } }
 *   { type: 'wc_cart_response',  requestId: '<id>', success: false, error: '<message>' }
 */
( function () {
	'use strict';

	// Config is injected by PHP via wp_localize_script.
	var config = window.aiChatbotWooBridge;
	if ( ! config || ! config.iframeOrigin || ! config.nonce || ! config.storeApiUrl ) {
		return;
	}

	var iframeOrigin = config.iframeOrigin; // e.g. 'https://agents.robofy.ai'
	var nonce        = config.nonce;
	var storeApiUrl  = config.storeApiUrl.replace( /\/$/, '' ); // e.g. 'https://example.com/wp-json/wc/store/v1'

	/**
	 * Build standard headers for every WC Store API request.
	 */
	function buildHeaders() {
		return {
			'Content-Type'        : 'application/json',
			'Nonce'               : nonce,
			'X-WC-Store-API-Nonce': nonce
		};
	}

	/**
	 * Send a postMessage back to the iframe.
	 *
	 * @param {Window} source  The iframe's contentWindow (event.source).
	 * @param {Object} payload The message object to send.
	 */
	function reply( source, payload ) {
		if ( source && typeof source.postMessage === 'function' ) {
			source.postMessage( payload, iframeOrigin );
		}
	}

	/**
	 * Parse an error message out of a WC Store API error response.
	 *
	 * @param  {Response} response The fetch Response object.
	 * @return {Promise<string>}
	 */
	function parseErrorMessage( response ) {
		return response.json()
			.then( function ( body ) {
				return ( body && body.message ) ? body.message : response.statusText;
			} )
			.catch( function () {
				return response.statusText || 'Unknown error';
			} );
	}

	/**
	 * Handle a wc_cart_request message from the iframe.
	 *
	 * @param {Window} source    event.source
	 * @param {string} requestId Caller-supplied correlation ID.
	 * @param {string} action    'get_cart' | 'add_item' | 'remove_item'
	 * @param {Object} payload   Action-specific parameters.
	 */
	function handleCartRequest( source, requestId, action, payload ) {
		var fetchOptions;

		if ( action === 'get_cart' ) {
			fetchOptions = {
				method     : 'GET',
				headers    : buildHeaders(),
				credentials: 'include'
			};

			fetch( storeApiUrl + '/cart', fetchOptions )
				.then( function ( response ) {
					if ( response.ok ) {
						return response.json().then( function ( data ) {
							reply( source, { type: 'wc_cart_response', requestId: requestId, success: true, data: data } );
						} );
					}
					return parseErrorMessage( response ).then( function ( msg ) {
						reply( source, { type: 'wc_cart_response', requestId: requestId, success: false, error: msg } );
					} );
				} )
				.catch( function () {
					reply( source, { type: 'wc_cart_response', requestId: requestId, success: false, error: 'Network error' } );
				} );

		} else if ( action === 'add_item' ) {
			var addBody = {
				id       : payload && payload.product_id ? payload.product_id : 0,
				quantity : payload && payload.quantity   ? payload.quantity   : 1,
				variation: payload && payload.variation  ? payload.variation  : []
			};

			fetchOptions = {
				method     : 'POST',
				headers    : buildHeaders(),
				credentials: 'include',
				body       : JSON.stringify( addBody )
			};

			fetch( storeApiUrl + '/cart/add-item', fetchOptions )
				.then( function ( response ) {
					if ( response.ok ) {
						return response.json().then( function ( data ) {
							reply( source, { type: 'wc_cart_response', requestId: requestId, success: true, data: data } );
						} );
					}
					return parseErrorMessage( response ).then( function ( msg ) {
						reply( source, { type: 'wc_cart_response', requestId: requestId, success: false, error: msg } );
					} );
				} )
				.catch( function () {
					reply( source, { type: 'wc_cart_response', requestId: requestId, success: false, error: 'Network error' } );
				} );

		} else if ( action === 'remove_item' ) {
			var removeBody = {
				key: payload && payload.cart_item_key ? payload.cart_item_key : ''
			};

			fetchOptions = {
				method     : 'POST',
				headers    : buildHeaders(),
				credentials: 'include',
				body       : JSON.stringify( removeBody )
			};

			fetch( storeApiUrl + '/cart/remove-item', fetchOptions )
				.then( function ( response ) {
					if ( response.ok ) {
						return response.json().then( function ( data ) {
							reply( source, { type: 'wc_cart_response', requestId: requestId, success: true, data: data } );
						} );
					}
					return parseErrorMessage( response ).then( function ( msg ) {
						reply( source, { type: 'wc_cart_response', requestId: requestId, success: false, error: msg } );
					} );
				} )
				.catch( function () {
					reply( source, { type: 'wc_cart_response', requestId: requestId, success: false, error: 'Network error' } );
				} );

		} else {
			reply( source, { type: 'wc_cart_response', requestId: requestId, success: false, error: 'Unknown action: ' + action } );
		}
	}

	/**
	 * Central message listener.
	 */
	function onMessage( event ) {
		// Security: only accept messages from the trusted iframe origin.
		if ( event.origin !== iframeOrigin ) {
			return;
		}

		var data = event.data;
		if ( ! data || typeof data !== 'object' ) {
			return;
		}

		if ( data.type === 'wc_bridge_ping' ) {
			// Handshake — let the iframe know the bridge is present and share the nonce.
			reply( event.source, { type: 'wc_bridge_ready', nonce: nonce } );
			return;
		}

		if ( data.type === 'wc_cart_request' ) {
			handleCartRequest(
				event.source,
				data.requestId || '',
				data.action    || '',
				data.payload   || {}
			);
		}
	}

	// Attach listener. DOMContentLoaded may have already fired if the script is
	// in the footer (in_footer = true), so use a readyState guard.
	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', function () {
			window.addEventListener( 'message', onMessage );
		} );
	} else {
		window.addEventListener( 'message', onMessage );
	}

}() );
