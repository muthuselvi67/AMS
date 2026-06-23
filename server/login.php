<?php
$conn = mysqli_connect("localhost","root","","database_name");

$email = $_POST['email'];
$password = $_POST['password'];

$query = "SELECT * FROM users WHERE email='$email' AND password='$password'";
$result = mysqli_query($conn, $query);

if(mysqli_num_rows($result) > 0){
    $row = mysqli_fetch_assoc($result);

    echo json_encode([
        "status" => "success",
        "role" => $row['role']
    ]);
}else{
    echo json_encode([
        "status" => "failed"
    ]);
}
?>