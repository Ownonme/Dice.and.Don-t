import React from 'react';

export default function SidebarPages(props: any) {
    const asideStyle: React.CSSProperties = {
        width: 240,
        padding: '12px 10px',
        background: '#141414',
        borderRight: '1px solid #2a2a2a',
        height: '100%',
        boxSizing: 'border-box',
        overflowY: 'auto'
    };
    const itemStyle: React.CSSProperties = {
        padding: '8px 10px',
        borderRadius: 8,
        color: '#eaeaea',
        border: '1px solid #2a2a2a',
        marginBottom: 8,
        cursor: 'pointer'
    };
    const activeStyle: React.CSSProperties = {
        ...itemStyle,
        background: '#1f1f1f',
        border: '1px solid #3a3a3a'
    };
    const headerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        gap: 8
    };
    const closeBtnStyle: React.CSSProperties = {
        height: 28,
        padding: '0 8px',
        borderRadius: 6,
        background: '#2a2a2a',
        color: '#eaeaea',
        border: '1px solid #3a3a3a',
        cursor: 'pointer'
    };

    return (
        <aside style={asideStyle}>
            <div style={headerStyle}>
                <div style={{fontWeight: 600}}>Pagine</div>
                <button style={closeBtnStyle} onClick={() => props.onClose?.()} title="Chiudi" aria-label="Chiudi">Chiudi</button>
            </div>
            {/* Intestazione */}
            <div style={{fontWeight: 600, marginBottom: 8}}>Pagine</div>
            {props.pages?.map((p: any, i: number) => (
                <div
                    key={p.id ?? i}
                    style={props.selectedPageId === p.id ? activeStyle : itemStyle}
                    onClick={() => props.onSelectPage?.(p.id)}
                >
                    {p.title || `Pagina ${i + 1}`}
                </div>
            ))}
            {/* Nuova pagina + conteggio */}
            <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid #2a2a2a' }}>
                <div style={{ color: '#aaaaaa', fontSize: 12, marginBottom: 8 }}>
                    {`Totale: ${props.pages?.length ?? 0} pagine`}
                </div>
                <button
                    style={{ ...itemStyle, background: '#1f1f1f', border: '1px solid #3a3a3a' }}
                    onClick={() => props.onAddPage?.()}
                >
                    + Nuova pagina
                </button>
            </div>
        </aside>
    );
}