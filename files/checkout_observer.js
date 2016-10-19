(function()
{
	var CheckoutObserver =
	{
		appDomain: similarproducts.b.site,
		observerLifetime: 15 * 60 * 1000, // 15 minutes
		opener: null,

		initialize: function()
		{
			this.opener = window.opener && window.opener.top || window.opener;

			if (window.addEventListener)
			{
				window.addEventListener("message", this.openerMessagesRouter.bind(this), false);

				if (this.opener)
				{
					this.observeCheckout();
				}
				else
				{
					this.isCheckoutPage();
				}
			}
		},

		observeCheckout: function()
		{
			var observerTimestamp = parseInt(localStorage.getItem('__sfObserveCheckout'));

			if (this.isObserverTimestampValid(observerTimestamp))
			{
				this.isCheckoutPage();
			}
			else
			{
				localStorage.removeItem('__sfCheckoutDone');

				this.attemptOpenerHandshake();
			}
		},

		isCheckoutPage: function()
		{
			var observerTimestamp = parseInt(localStorage.getItem('__sfObserveCheckout'));
			var checkoutDone = parseInt(localStorage.getItem('__sfCheckoutDone'));

			if (!checkoutDone && this.isObserverTimestampValid(observerTimestamp) && location.href.search(/checkout/i) !== -1)
			{
				this.completeCheckoutCycle();
			}
		},

		attemptOpenerHandshake: function()
		{
			this.opener && this.sendMessageToWindow(this.opener, 'handshakeFromSpawnedWindow'); // Attempt handshake with opener
		},

		handshakeFromSpawnedWindow: function(data, event) // Invoked by the spawned window on the opener
		{
			event.source && this.sendMessageToWindow(event.source, 'handshakeFromOpener',
			{
				userId: similarproducts.b.userid,
				sessionId: spsupport.p.initialSess
			}); // Politely return gesture (and user id) to the spawned window
		},

		handshakeFromOpener: function(data) // Invoked by the opener on the spawned window. The handshake was successful
		{
			localStorage.setItem('__sfObserveCheckout', new Date().getTime()); // Set the observer timestamp
			localStorage.setItem('__sfObserveCheckoutUserId', data.userId); // Save the user id received from the opener
			localStorage.setItem('__sfObserveCheckoutSessionId', data.sessionId); // Save the session id received from the opener

			this.observeCheckout();
		},

		isObserverTimestampValid: function(observerTimestamp)
		{
			return observerTimestamp && (observerTimestamp+this.observerLifetime > new Date().getTime()) || false;
		},

		openerMessagesRouter: function(event)
		{
			var data = event.data.split('__similarproductsCheckoutNamespaceMarker')[1];

			data = data && JSON.parse(data) || null;

            if (data && typeof this[data.fn] === 'function')
            {
                this[data.fn](data.data, event);
            }
		},

		sendMessageToWindow: function(wnd, fn, data)
		{
			var message =
            {
                fn: fn,
                data: data
            };

            wnd.postMessage('__similarproductsCheckoutNamespaceMarker'+JSON.stringify(message), '*');
		},

		completeCheckoutCycle: function()
		{
			var sb = similarproducts && similarproducts.b || {};
			var userId = localStorage.getItem('__sfObserveCheckoutUserId');
			var sessionId = localStorage.getItem('__sfObserveCheckoutSessionId');
			var pixel = new Image();
			var reportParamsString = 'action=checkout';

			reportParamsString += "&dlsource=" + sb.dlsource;
	        reportParamsString += "&version=" + sb.appVersion;
	        reportParamsString += "&userid=" + userId;
	        reportParamsString += "&sessionid=" + sessionId;
	        reportParamsString += "&page_url=" + encodeURIComponent(document.location.href);

			pixel.src = this.appDomain + 'trackSession.action?' + reportParamsString;

			localStorage.setItem('__sfCheckoutDone', 1);
		}
	};

	CheckoutObserver.initialize();
})();