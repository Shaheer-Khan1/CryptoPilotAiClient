import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Mail } from "lucide-react";

export default function Settings() {
  const { userData, logout } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState(userData?.email || "");
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Mock update - in real app, this would call an API
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Email Updated",
        description: "Your email has been updated successfully.",
      });
    }, 1000);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") {
      toast({
        title: "Invalid Confirmation",
        description: "Please type 'DELETE' to confirm account deletion.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    // Mock deletion - in real app, this would call an API
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });
      logout();
    }, 1000);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences</p>
      </div>

      <div className="space-y-8">
        {/* Email Settings */}
        <Card className="bg-white/90 dark:bg-surface/50 backdrop-blur-xl border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailUpdate} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white dark:bg-slate-800 text-black dark:text-white border-slate-300 dark:border-slate-600"
                  placeholder="Enter your email address"
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update Email"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Delete Account */}
        <Card className="bg-white/90 dark:bg-surface/50 backdrop-blur-xl border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-red-500 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">
                <strong>Warning:</strong> This action cannot be undone. This will permanently delete your account and remove all data from our servers.
              </p>
            </div>
            
            <div>
              <Label htmlFor="deleteConfirm">Type "DELETE" to confirm</Label>
              <Input
                id="deleteConfirm"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                className="bg-white dark:bg-slate-800 text-black dark:text-white border-slate-300 dark:border-slate-600"
                placeholder="Type DELETE to confirm"
              />
            </div>
            
            <Button 
              variant="destructive" 
              onClick={handleDeleteAccount}
              disabled={loading || deleteConfirm !== "DELETE"}
            >
              {loading ? "Deleting..." : "Delete Account"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
