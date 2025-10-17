import './Open.css'
import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'wouter'
import { useDeviceResolution } from '../../contexts/DeviceResolution';
import { db } from '../../api/db';
import { envVar } from '../../utils/env';

function OpenPage() {
    const [_, navigate ] = useLocation();
    const { deviceType } = useDeviceResolution();
    const [msg, setMsg] = useState('');
    const [viewGitInfo, setViewGitInfo] = useState(false);
    const [gitInfo, setGitInfo] = useState(
        {
            "back":{"branch":"unknown", commit:"unknown"},
            "front":{"branch":"unknown", commit:"unknown"}
        }
    );
    const openTimer = useRef();

    async function dbAvailable() {
        const result = await db.available();

        if (result.success) {
            const frontendGitInfo = {
                branch:envVar('VITE_FRONTEND_GIT_BRANCH') || "Unknown", 
                commit:envVar('VITE_FRONTEND_GIT_COMMIT') || "Unknown"
            };
            setGitInfo({back:result.git_info, front:frontendGitInfo});
            openTimer.current = setTimeout(() => {
                navigate('/admin');
            }, 3000)
        }
        else {
            console.log(result.message);
            setMsg(result.message);
        }
    }

    function titleClick() {
        if (viewGitInfo)
            navigate('/admin');
        else {
            clearTimeout(openTimer.current);
            setViewGitInfo(true);
        }
    }

    useEffect(() => {
        dbAvailable();
    }, [])

    return (
        <div className={`open-page ${deviceType}`}>
            <div className="title" onClick={titleClick}>
                <h1>מיידעון</h1>
            </div>
            {
                msg &&
                <h3>{msg}</h3>
            }
            {
                viewGitInfo &&
                <div className='git-info'>
                    <div>
                        BACKEND
                    </div>
                    <b>
                        <div>
                            {`branch: ${gitInfo.back.branch}`}
                        </div>
                        <div>
                            {`commit: ${gitInfo.back.commit}`}
                        </div>
                    </b>
                    <div>
                        FRONTEND
                    </div>
                    <b>
                        <div>
                            {`branch: ${gitInfo.front.branch}`}
                        </div>
                        <div>
                            {`commit: ${gitInfo.front.commit}`}
                        </div>
                    </b>
                </div>
            }
        </div>
    )
}

export default OpenPage;
