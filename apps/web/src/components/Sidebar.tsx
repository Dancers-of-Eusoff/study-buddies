import styles from "./Sidebar.module.css";

interface ConvoProps {
    convo: string;
    sender: string;
    key: number;
}

function Sidebar() {
    const convos = [
        {
            convo: "Hi I'm Jeff",
            sender: "user1",
            key: 1
        },
        {
            convo: "Hi Jeff I'm gay",
            sender: "user2",
            key: 2
        },
        {
            convo: "GAY?? OMG YOU GAY LOU",
            sender: "user3",
            key: 3
        },
        {
            convo: "Shuddup don't laugh at me with your name",
            sender: "user2",
            key: 4
        },
        {
            convo: "What's his name?",
            sender: "user1",
            key: 5
        }
    ]

    function Convo({ convo, sender }: ConvoProps) {
        return (
            <div className={ sender == "user1" ? styles.myConvo : styles.theirConvo }>
                    {sender != "user1" && (
                        <div>
                            <img src="/husband.gif" alt="gay" style={{ "width": "33px", "borderRadius": "25px" }}/>
                        </div>
                    )}
                    <div>
                        { convo }
                    </div>
                    {sender == "user1" && (
                        <div>
                            <img src="/pakistani.gif" alt="gay" style={{ "width": "33px", "borderRadius": "25px" }}/>
                        </div>
                    )}
            </div>
        )
    }

    function Chats() {
        return (
            <div style={{
                "display": "flex",
                "flexDirection": "column",
                "flexGrow": "1"
            }}>
                { convos.map(c => {
                    return <Convo convo={ c.convo } sender={ c.sender } key={ c.key }/>
                }) }
            </div>
        )
    }

    function Chatbox() {
        return (
            <div style={{
                "height": "25%"
            }}>
                <textarea name="chatbox"  value="Type here..." style={{ "width": "100%", "height": "100%", "border": "none", "boxSizing": "border-box", "boxShadow": "inset 0px 15px 10px -10px rgba(0, 0, 0, 0.2)", "backgroundColor": "#FCEBD6", "padding": "10px 5px" }}/>
            </div>
        )
    }

    return (
        <>
            <Chats />
            <Chatbox />
        </>
    )
}

export default Sidebar