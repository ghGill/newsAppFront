import { useState, useEffect, useRef } from 'react';
import '../Admin.css'
import Section from './Section';
import { db } from '../../../api/db';
import ConfirmModal from '../../../components/ConfirmModal'
import { useSettingsContext } from '../../../contexts/SettingsContext';
import { getSettingsFromDB } from '../../../utils/settings';

function Users({ users, setUsers, setActiveTab }) {
    const newEmptyUser = {name:'', email:'', password:'', role:''};
    
    const [newUser, setNewUser] = useState(newEmptyUser);
    const [msg, setMsg] = useState({});
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const selectedUser = useRef(0);
    const { setSettings } = useSettingsContext();
 
    function clearNewUser() {
        setNewUser(newEmptyUser);
    }

    function clearMsg() {
        displayMsg("", "")
    }

    function displayMsg(text, type="") {
        setMsg({text:text, type:type})
    }

    async function addUser(e) {
        e.preventDefault();

        const result = await db.addUser(newUser);

        if (result.success) {
            setUsers([...users, {...newUser, id:result.data.id}]);
            console.log({...newUser, id:result.data.id});
            
            clearNewUser();
            displayMsg("User added successfully.")
        }
        else {
            displayMsg(result.message, "error")
        }
    }

    function updateNewUserData(e) {
        clearMsg();
        setNewUser({...newUser, [e.target.name]:e.target.value});
    }

    function deleteUser(user) {
        selectedUser.current = user;
        setOpenDeleteModal(true);
    }

    useEffect(() => {
        clearNewUser();
        clearMsg();
    }, [])

    useEffect(() => {
        if (msg.text === '')
            return;

        const msgTimer = setTimeout(() => {
            clearMsg();
        }, 5000);

        return () => clearTimeout(msgTimer);
    }, [msg])

    async function switchToUserSettings(e, user) {
        e.preventDefault();

        const result = await getSettingsFromDB(user);

        if (result.success) {
            setSettings(result.data);
            setActiveTab("settings");
        }
    }

    return (
        <>
            {
                openDeleteModal &&
                <ConfirmModal
                    titleData={{ text: `Delete user ${selectedUser.current.name}?`, style: { fontSize: "24px" } }}
                    yesData={
                        {
                            text: "Yes",
                            style: { "backgroundColor": "red", "border": "none", "padding": "16px", "fontWeight": "bold" },
                            noHover: true,
                            actionHandler: (async () => { 
                                selectedUser.current.id = selectedUser.current.id?? selectedUser.current._id;
                                await db.deleteUser(selectedUser.current);
                                const updatedUsers = users.filter(u => u.email != selectedUser.current.email);
                                setUsers(updatedUsers);
                             })
                        }
                    }
                    noData={
                        {
                            text: "No",
                            style: { "backgroundColor": "white", "color": "black", "padding": "16px", "border": "none" }
                        }
                    }
                    closeHandler={() => { setOpenDeleteModal(false) }}
                />
            }

            <div className='users-page'>
                <Section title="Sign Up">
                    <form className='add-user' onSubmit={addUser}>
                        <div className='add-user-detailes'>
                            <div>
                                <input 
                                    name="name"
                                    value={newUser.name} 
                                    className="element" 
                                    type='text' 
                                    placeholder='Name' 
                                    onChange={ updateNewUserData }
                                    required
                                >
                                </input>
                            </div>
                            <div>
                                <input 
                                    name="email"
                                    value={newUser.email} 
                                    className="element" 
                                    type='email' 
                                    placeholder='Email' 
                                    onChange={ updateNewUserData }
                                    required
                                >
                                </input>
                            </div>
                            <div>
                                <input 
                                    name="password"
                                    value={newUser.password} 
                                    className="element" 
                                    type='text' 
                                    placeholder='Password' 
                                    onChange={ updateNewUserData }
                                    required
                                >
                                </input>
                            </div>
                            <div>
                                <select  
                                    name="role"
                                    value={newUser.role} 
                                    className="element" 
                                    onChange={ updateNewUserData }
                                    required
                                >
                                    <option value='' disabled>Role</option>
                                    <option value='Admin'>Admin</option>
                                    <option value='Editor'>Editor</option>
                                </select>
                            </div>
                        </div>
                        <button type="submit" className="element">Save</button>
                    </form>
                    <div className={`add-user-msg ${msg.type}`}>
                        {msg.text}
                    </div>
                </Section>

                <Section title='Users List'>
                    <div className='users-table'>
                        <table>
                            <thead>
                                <tr>
                                    <th width="30%">Name</th>
                                    <th width="50%">Email</th>
                                    <th width="10%">Role</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {
                                    users.map((u, index) => (
                                        <tr key={index}>
                                            <td>{u.name}</td>
                                            <td>{u.email}</td>
                                            <td>{u.role}</td>
                                            <td>
                                                <div className='actions'>
                                                    <div className='font-icon' onClick={(e) => { switchToUserSettings(e, u) }}>
                                                        <i className="fa fa-gear"></i>
                                                    </div>
                                                    <div className={`font-icon ${u.protected ? 'disabled' : ''}`} onClick={() => { 
                                                        if (!u.protected)
                                                            deleteUser(u) 
                                                    }}>
                                                        <i className="fa fa-trash"></i>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                }
                            </tbody>
                        </table>
                    </div>
                </Section>
            </div>
        </>
    )
}

export default Users;
