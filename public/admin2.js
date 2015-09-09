var Hello = React.createClass({
    render: function() {
        return <div>Hello, {this.props.name}</div>;
    }
});

React.render(<Hello name="Jon" />, document.getElementById('content'));
