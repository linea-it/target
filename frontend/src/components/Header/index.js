"use client";
import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import ListItem from '@mui/material/ListItem';
import List from '@mui/material/List';
import Link from '@mui/material/Link';
import Image from 'next/image'
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import Drawer from '@mui/material/Drawer';
import ListItemText from '@mui/material/ListItemText';
import { useAuth } from "@/contexts/AuthContext";
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import LoggedUser from '@/components/LoggedUser';

export default function Header() {
  const { user } = useAuth();

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const navItems = [
    {
      description: 'Home',
      href: '/'
    },
    {
      description: 'About',
      href: '/about/'
    },
    {
      description: 'Documentation',
      href: 'https://docs.linea.org.br/'
    },
    {
      description: 'Monitoring',
      href: 'https://www.linea.org.br/grafana/'
    },
    {
      description: 'Contact',
      href: 'https://scienceplatform-dev.linea.org.br/lsp/contact'
    },
    {
      description: 'LSP',
      href: 'https://scienceplatform-dev.linea.org.br/lsp'
    },
    {
      description: 'IDAC',
      href: 'https://scienceplatform-dev.linea.org.br/idac'
    }
  ];

  const toggleDrawer = (open) => () => {
    setDrawerOpen(open);
  };

  const drawerList = () => (
    <List>
      {navItems.map(item => (
        <ListItem button key={item.href}>
          <Link href={item.href} color="inherit" underline="none">
            <ListItemText primary={item.description} />
          </Link>
        </ListItem>
      ))}
    </List>
  );

  return (
    <React.Fragment>
      <AppBar position="fixed" sx={{
        background: '-webkit-linear-gradient(120deg,  #31297f, #0989cb)',
      }}>
        <Toolbar>
          <Link href="/">
            <Image src="/linea-symbol.svg" alt="LIneA" width={52} height={40} />
          </Link>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={toggleDrawer(true)}
            sx={{ display: { xs: 'block', md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <List sx={{ display: { xs: 'none', md: 'flex' } }}>
            {navItems.map(item => (
              <ListItem key={item.href} sx={{ width: 'auto' }}>
                <Link href={item.href} color="inherit" underline="none">
                  {item.description}
                </Link>
              </ListItem>
            ))}
          </List>
          <Box sx={{ flexGrow: 1 }} />

          {user && (
            <LoggedUser username={user?.username} />
          )}
          {!user && (
            <Button href="/admin/login/?next=/" color="inherit" sx={{ display: { xs: 'none', md: 'block' } }}>
              Sign In
            </Button>
          )}
        </Toolbar>
        <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}>
          {drawerList()}
        </Drawer>
      </AppBar>
      {/* https://mui.com/material-ui/react-app-bar/#fixed-placement */}
      {/* The toolbar is used to create space for the AppBar */}
      <Toolbar />
    </React.Fragment>
  );
}
