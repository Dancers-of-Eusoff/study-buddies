function Cockpit() {
    function User() {
        return (
            <div style={{
                "backgroundColor": "white",
                "margin": "10px",
                "height": "70vh",
                "borderRadius": "50px",
                "display": "flex",
                "justifyContent": "center",
                "alignItems": "center"
            }}>
                <img src="/social-page.gif" alt="user" style={{"height": "70%"}}/>
            </div>
        )
    }

    return (
        <div>
            <User />
        </div>
    )
}

export default Cockpit