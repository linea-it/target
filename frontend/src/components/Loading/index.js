import PropTypes from 'prop-types'
import CircularProgress from '@mui/material/CircularProgress';
import Backdrop from '@mui/material/Backdrop';

export default function Loading({ isLoading }) {

  return (
    <Backdrop
      sx={{ color: '#fff', zIndex: theme => theme.zIndex.drawer + 1 }}
      open={isLoading}
    >
      <CircularProgress color="inherit" />
    </Backdrop>
  )
}
Loading.defaultProps = {
  isLoading: false,
}
Loading.propTypes = {
  isLoading: PropTypes.bool.isRequired,
}
