export default async function IndexPage() {
  const pageStyle = {
    height: '100%',
    width: '100%',
    overflow: 'hidden',
  };
  
  return (
    <div style={pageStyle}>
      <div className="flex items-center justify-center h-screen overflow-hidden">
        <div className="mx-auto max-w-2xl px-4">
          <div className="rounded-lg border bg-background p-8 text-center">
            <h1 className="mb-2 text-lg font-semibold">Welcome to Meshiagare!</h1>
            <p className="mb-2 leading-normal text-muted-foreground">
              Click on &quot;New Chat&quot; on the sidebar on the left to start finding new places to eat!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}