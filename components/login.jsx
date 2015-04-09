var _ = require('underscore');
var React = require('react/addons');
var Router = require('react-router');
var Link = Router.Link;

var config = require('../lib/config');
var TeachAPIClientMixin = require('../mixins/teach-api-client');
var ga = require('react-ga');

var LogoutLink = React.createClass({
  mixins: [TeachAPIClientMixin, Router.State, React.addons.PureRenderMixin],
  render: function() {
    var callbackURL = config.ORIGIN + this.getPathname();
    var loginBaseURL = this.getTeachAPI().baseURL;
    var href = loginBaseURL + '/auth/oauth2/logout?callback=' +
               encodeURIComponent(callbackURL);
    var props = _.extend({}, this.props, {
      href: href
    });

    return React.DOM.a(props, this.props.children);
  }
});

var LoginLink = React.createClass({
  mixins: [TeachAPIClientMixin, Router.State, React.addons.PureRenderMixin],
  propTypes: {
    callbackSearch: React.PropTypes.string,
    action: React.PropTypes.string
  },
  render: function() {
    var callbackPath = this.getPathname() +
                       (this.props.callbackSearch || '');
    var callbackURL = config.ORIGIN + callbackPath;
    var loginBaseURL = this.getTeachAPI().baseURL;
    var action = this.props.action || 'signin';
    var href = loginBaseURL + '/auth/oauth2/authorize?callback=' +
               encodeURIComponent(callbackURL) + '&action=' + action;
    var props = _.extend({}, this.props, {
      href: href
    });

    if (process.env.NODE_ENV !== 'production' &&
        !/^(signin|signup)$/.test(action)) {
      console.warn("unrecognized action: " + this.props.action);
    }

    return React.DOM.a(props, this.props.children);
  }
});

var Login = React.createClass({
  mixins: [TeachAPIClientMixin],
  statics: {
    LoginLink: LoginLink,
    LogoutLink: LogoutLink,
    teachAPIEvents: {
      'login:error': 'handleApiLoginError',
      'login:cancel': 'handleApiLoginCancel',
      'login:success': 'handleApiLoginSuccess',
      'logout': 'handleApiLogout'
    }
  },
  getDefaultProps: function() {
    return {
      alert: defaultAlert
    };
  },
  componentDidMount: function() {
    var teachAPI = this.getTeachAPI();

    teachAPI.checkLoginStatus();
    this.setState({username: teachAPI.getUsername()});
  },
  getInitialState: function() {
    return {
      username: null,
      loggingIn: false
    };
  },
  handleApiLoginError: function(err) {
    this.setState({loggingIn: false});

    if (!config.IN_TEST_SUITE) {
      console.log("Teach API error", err);
      ga.event({ category: 'Login', action: 'Teach API Error',
                nonInteraction:true});
    }

    if (err.hasNoWebmakerAccount) {
      this.props.alert(
        "An error occurred when logging in. Are you sure you " +
        "have a Webmaker account associated with the email " +
        "address you used?"
      );
      ga.event({ category: 'Login', action: 'Error: Has no Webmaker Account',
                nonInteraction:true});
    } else {
      this.props.alert("An error occurred! Please try again later.");
      ga.event({ category: 'Login', action: 'Error Occurred',
                nonInteraction:true});
    }
  },
  handleApiLoginCancel: function() {
    this.setState({loggingIn: false});
    ga.event({ category: 'Login', action: 'Cancelled Login' });
  },
  handleApiLoginSuccess: function(info) {
    this.setState({username: this.getTeachAPI().getUsername(),
                   loggingIn: false});
    ga.event({ category: 'Login', action: 'Logged In' });
  },
  handleApiLogout: function() {
    this.setState({username: null, loggingIn: false});
    ga.event({ category: 'Login', action: 'Logged Out' });
  },
  render: function() {
    var content;

    if (this.state.loggingIn) {
      content = (
        <span>
          Logging in&hellip;
        </span>
      );
    } else if (this.state.username) {
      content = (
        <span>
          Logged in as {this.state.username} | <LogoutLink>Logout</LogoutLink>
        </span>
      );
    } else {
      content = (
        <span>
          <LoginLink action="signup">Create an account</LoginLink> | <LoginLink>Log in</LoginLink>
        </span>
      );
    }

    return (
      <div className="sidebar-login">
        {content}
      </div>
    );
  }
});

function defaultAlert(message) {
  if (process.browser) {
    window.alert(message);
  } else {
    console.log("User alert: " + message);
  }
}

module.exports = Login;
